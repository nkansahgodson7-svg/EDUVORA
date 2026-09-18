import React, { useState, useEffect } from 'react';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { ArrowLeft, Edit2, Trash2, ShieldAlert, CheckCircle2, XCircle, Users, Activity, Building2, Save, X, Loader2, UploadCloud } from 'lucide-react';
import { Tenant } from '../../types';
import { supabase } from '../../lib/supabase';
import { SchoolImportWizard } from './SchoolImportWizard';

interface SchoolDetailsProps {
  tenantId: string;
  onBack: () => void;
}

export const SchoolDetails: React.FC<SchoolDetailsProps> = ({ tenantId, onBack }) => {
  const { allTenants, allUsers, updateTenant, deleteTenant } = useTenantAuth();
  const tenant = allTenants.find(t => t.id === tenantId);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTenant, setEditedTenant] = useState<Partial<Tenant>>(tenant || {});
  
  const [dbCounts, setDbCounts] = useState({ students: 0, teachers: 0 });
  const [isPopulating, setIsPopulating] = useState(false);
  const [populateStatus, setPopulateStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  useEffect(() => {
    if (!tenantId || !isUUID(tenantId)) return;
    const fetchCounts = async () => {
      try {
        const [{ count: studentCount }, { count: teacherCount }] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', tenantId),
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', tenantId)
        ]);
        setDbCounts({
          students: studentCount || 0,
          teachers: teacherCount || 0
        });
      } catch (err) {
        console.error('Failed to fetch counts:', err);
      }
    };
    fetchCounts();
  }, [tenantId]);
  
  if (!tenant) return null;

  const schoolAdmin = allUsers.find(u => u.school_id === tenant.id && u.role === 'school_admin');

  const handlePopulateDatabase = async () => {
    setPopulateStatus(null);
    setIsPopulating(true);
    
    // If it's a legacy local mock ID, simulate the insertion
    if (!isUUID(tenant.id)) {
      setTimeout(() => {
        setDbCounts(prev => ({
          students: prev.students + 50,
          teachers: prev.teachers + 10
        }));
        setPopulateStatus({ type: 'success', message: 'Simulated inserting 50 students and 10 teachers to legacy local school!' });
        setIsPopulating(false);
        setTimeout(() => setPopulateStatus(null), 5000);
      }, 1000);
      return;
    }

    try {
      const sampleStudents = Array.from({ length: 50 }).map((_, i) => ({
        school_id: tenant.id,
        student_code: `STU-${Math.floor(Math.random() * 100000)}`,
        first_name: `Student${i + 1}`,
        last_name: 'Sample',
        grade_level: ['10th', '11th', '12th'][Math.floor(Math.random() * 3)],
      }));
      
      const sampleTeachers = Array.from({ length: 10 }).map((_, i) => ({
        school_id: tenant.id,
        staff_code: `TCH-${Math.floor(Math.random() * 100000)}`,
        first_name: `Teacher${i + 1}`,
        last_name: 'Sample',
        email: `teacher${i + 1}@example.com`,
      }));

      const { error: sError } = await supabase.from('students').insert(sampleStudents);
      if (sError) throw sError;
      
      const { error: tError } = await supabase.from('teachers').insert(sampleTeachers);
      if (tError) throw tError;

      // Refresh counts
      setDbCounts(prev => ({
        students: prev.students + 50,
        teachers: prev.teachers + 10
      }));
      setPopulateStatus({ type: 'success', message: 'Successfully added 50 students and 10 teachers!' });
      
    } catch (err: any) {
      console.error(err);
      setPopulateStatus({ type: 'error', message: 'Failed to populate database: ' + (err.message || 'Unknown error') });
    } finally {
      setIsPopulating(false);
      setTimeout(() => setPopulateStatus(null), 5000);
    }
  };

  const handleSave = () => {
    updateTenant(tenant.id, editedTenant);
    setIsEditing(false);
  };

  const handleToggleStatus = () => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    updateTenant(tenant.id, { status: newStatus });
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${tenant.name}? This action cannot be undone.`)) {
      deleteTenant(tenant.id);
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full py-4 sm:py-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">{tenant.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/60' : 'bg-rose-100 text-rose-700 border border-rose-200/60'
            }`}>
              {tenant.status}
            </span>
          </div>
          <p className="text-sm text-stone-500 font-mono mt-1">{tenant.subdomain}.eduvora.io</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition-colors flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
          ) : (
            <>
              <button 
                onClick={() => {
                  setEditedTenant(tenant);
                  setIsEditing(false);
                }}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold text-sm transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] text-white font-bold text-sm transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Editing */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-400" />
              Institution Profile
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Institution Name</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editedTenant.name || ''}
                    onChange={(e) => setEditedTenant({ ...editedTenant, name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:border-[#1a56db] focus:ring-1 focus:ring-[#1a56db] outline-none"
                  />
                ) : (
                  <div className="text-sm font-semibold text-stone-900">{tenant.name}</div>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Subdomain</label>
                {isEditing ? (
                  <div className="flex items-center">
                    <input 
                      type="text" 
                      value={editedTenant.subdomain || ''}
                      onChange={(e) => setEditedTenant({ ...editedTenant, subdomain: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-l-lg text-sm focus:border-[#1a56db] focus:ring-1 focus:ring-[#1a56db] outline-none"
                    />
                    <span className="px-3 py-2 bg-stone-100 border-y border-r border-stone-200 rounded-r-lg text-sm text-stone-500 font-mono">
                      .eduvora.io
                    </span>
                  </div>
                ) : (
                  <div className="text-sm font-mono text-stone-900">{tenant.subdomain}.eduvora.io</div>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Address / Location</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editedTenant.address || ''}
                    onChange={(e) => setEditedTenant({ ...editedTenant, address: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:border-[#1a56db] focus:ring-1 focus:ring-[#1a56db] outline-none"
                  />
                ) : (
                  <div className="text-sm font-semibold text-stone-900">{tenant.address || 'Not provided'}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Master Admin Name</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editedTenant.headmaster_name || ''}
                    onChange={(e) => setEditedTenant({ ...editedTenant, headmaster_name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:border-[#1a56db] focus:ring-1 focus:ring-[#1a56db] outline-none"
                  />
                ) : (
                  <div className="text-sm font-semibold text-stone-900">{tenant.headmaster_name || 'Not provided'}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Contact Email</label>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={editedTenant.contact_email || ''}
                    onChange={(e) => setEditedTenant({ ...editedTenant, contact_email: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:border-[#1a56db] focus:ring-1 focus:ring-[#1a56db] outline-none"
                  />
                ) : (
                  <div className="text-sm font-semibold text-stone-900">{tenant.contact_email || 'Not provided'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-stone-400" />
              Quick Actions
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              Upload an Excel (.xlsx) or CSV file to ingest student and teacher records for this school.
            </p>
            {populateStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${populateStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {populateStatus.message}
              </div>
            )}
            <button 
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm transition-colors border border-indigo-200/60 flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              Import Real Data
            </button>
          </div>
        </div>

        {/* Right Column: Danger Zone & Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-stone-400" />
              Users Summary
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                <span className="text-sm font-medium text-stone-600">School Admins</span>
                <span className="text-sm font-bold text-stone-900">{schoolAdmin ? '1' : '0'}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                <span className="text-sm font-medium text-stone-600">Teachers</span>
                <span className="text-sm font-bold text-stone-900">{dbCounts.teachers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-600">Students</span>
                <span className="text-sm font-bold text-stone-900">{dbCounts.students}</span>
              </div>
            </div>
          </div>

          <div className="bg-rose-50/50 rounded-2xl border border-rose-200/60 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Danger Zone
            </h2>
            
            <div className="space-y-4">
              <div>
                <button 
                  onClick={handleToggleStatus}
                  className="w-full flex justify-between items-center px-4 py-3 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors group"
                >
                  <span className="text-sm font-bold text-stone-900">
                    {tenant.status === 'active' ? 'Suspend School' : 'Reactivate School'}
                  </span>
                  {tenant.status === 'active' ? (
                    <XCircle className="w-4 h-4 text-stone-400 group-hover:text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-stone-400 group-hover:text-emerald-600" />
                  )}
                </button>
                <p className="text-xs text-stone-500 mt-2 px-1">
                  {tenant.status === 'active' 
                    ? 'Suspends access for all users in this institution. Data remains intact.'
                    : 'Restores access for all users in this institution.'}
                </p>
              </div>

              <div className="pt-4 border-t border-rose-200/60">
                <button 
                  onClick={handleDelete}
                  className="w-full flex justify-between items-center px-4 py-3 bg-rose-600 border border-rose-700 rounded-xl hover:bg-rose-700 transition-colors text-white group"
                >
                  <span className="text-sm font-bold">Delete School</span>
                  <Trash2 className="w-4 h-4 text-rose-300 group-hover:text-white" />
                </button>
                <p className="text-xs text-rose-600 mt-2 px-1">
                  Permanently deletes this institution and all associated data. This cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SchoolImportWizard 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        tenantId={tenant.id} 
        tenantName={tenant.name}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          // Re-fetch counts
          if (isUUID(tenant.id)) {
            Promise.all([
              supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', tenant.id),
              supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', tenant.id)
            ]).then(([{ count: sc }, { count: tc }]) => {
              setDbCounts({ students: sc || 0, teachers: tc || 0 });
            });
          }
        }}
      />
    </div>
  );
};
