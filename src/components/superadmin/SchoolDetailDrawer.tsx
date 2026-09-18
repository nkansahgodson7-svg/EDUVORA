import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Users, 
  GraduationCap, 
  Calendar, 
  Mail, 
  MapPin, 
  UserCheck, 
  UploadCloud, 
  Edit2, 
  Power, 
  Trash2, 
  ExternalLink,
  ShieldCheck,
  Search,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Tenant, Student, UserProfile } from '../../types';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { supabase } from '../../lib/supabase';
import { SchoolImportWizard } from './SchoolImportWizard';
import { EditSchoolModal } from './EditSchoolModal';

interface SchoolDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  onTenantUpdated?: () => void;
  onTenantDeleted?: () => void;
}

export const SchoolDetailDrawer: React.FC<SchoolDetailDrawerProps> = ({
  isOpen,
  onClose,
  tenantId,
  onTenantUpdated,
  onTenantDeleted,
}) => {
  const { allTenants, updateTenant, deleteTenant, loginAsRole, tenantStudents, availableTeachers } = useTenantAuth();

  const tenant = allTenants.find((t) => t.id === tenantId);

  // Modal states
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'teachers'>('overview');

  // Counts state
  const [dbStudentCount, setDbStudentCount] = useState<number>(0);
  const [dbTeacherCount, setDbTeacherCount] = useState<number>(0);
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [dbTeachers, setDbTeachers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPurgingStudents, setIsPurgingStudents] = useState(false);
  const [isPurgingTeachers, setIsPurgingTeachers] = useState(false);

  const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // Fetch real count from Supabase
  const refreshCounts = async () => {
    if (!tenantId) return;

    if (isUUID(tenantId)) {
      try {
        const [{ data: sData, count: sCount }, { data: tData, count: tCount }] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact' }).eq('school_id', tenantId).limit(100),
          supabase.from('teachers').select('*', { count: 'exact' }).eq('school_id', tenantId).limit(100),
        ]);

        setDbStudentCount(sCount || 0);
        setDbTeacherCount(tCount || 0);
        setDbStudents(sData || []);
        setDbTeachers(tData || []);
        return;
      } catch (err) {
        console.warn('Error fetching counts from Supabase:', err);
      }
    }

    // Fallback to local context
    const sLocal = tenantStudents.filter((s) => s.school_id === tenantId);
    const tLocal = availableTeachers.filter((t) => t.school_id === tenantId);
    setDbStudentCount(sLocal.length);
    setDbTeacherCount(tLocal.length);
    setDbStudents(sLocal);
    setDbTeachers(tLocal);
  };

  const handlePurgeStudents = async () => {
    if (!tenantId) return;
    if (!window.confirm(`Are you sure you want to purge all student records for "${tenant?.name}"? You can then re-import clean data.`)) return;
    setIsPurgingStudents(true);
    try {
      if (isUUID(tenantId)) {
        await supabase.from('students').delete().eq('school_id', tenantId);
      }
      await refreshCounts();
      onTenantUpdated?.();
    } catch (err) {
      console.error('Error purging students:', err);
    } finally {
      setIsPurgingStudents(false);
    }
  };

  const handlePurgeTeachers = async () => {
    if (!tenantId) return;
    if (!window.confirm(`Are you sure you want to purge all teacher records for "${tenant?.name}"? You can then re-import clean data.`)) return;
    setIsPurgingTeachers(true);
    try {
      if (isUUID(tenantId)) {
        await supabase.from('teachers').delete().eq('school_id', tenantId);
      }
      await refreshCounts();
      onTenantUpdated?.();
    } catch (err) {
      console.error('Error purging teachers:', err);
    } finally {
      setIsPurgingTeachers(false);
    }
  };

  useEffect(() => {
    if (isOpen && tenantId) {
      refreshCounts();
      setIsConfirmingDelete(false);
    }
  }, [isOpen, tenantId]);

  if (!isOpen || !tenant) return null;

  const handleToggleStatus = () => {
    const nextStatus = tenant.status === 'active' ? 'inactive' : 'active';
    updateTenant(tenant.id, { status: nextStatus });
    onTenantUpdated?.();
  };

  const handleDeleteTenant = () => {
    deleteTenant(tenant.id);
    setIsConfirmingDelete(false);
    onTenantDeleted?.();
    onClose();
  };

  const filteredStudents = dbStudents.filter((s) => {
    const q = searchQuery.toLowerCase();
    const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const code = (s.student_code || s.admission_number || '').toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const filteredTeachers = dbTeachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    const name = `${t.first_name || ''} ${t.last_name || ''}`.toLowerCase();
    const code = (t.staff_code || '').toLowerCase();
    const email = (t.email || '').toLowerCase();
    return name.includes(q) || code.includes(q) || email.includes(q);
  });

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-xs transition-opacity animate-in fade-in" 
      />

      {/* Slide-in Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl border-l border-stone-200 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-[#1a56db] shadow-2xs">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-stone-900 tracking-tight">{tenant.name}</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    tenant.status === 'active' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {tenant.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mt-1">
                  <span>Code: <strong className="text-stone-800">{tenant.subdomain}</strong></span>
                  <span>•</span>
                  <span>{tenant.subdomain}.eduvora.io</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-stone-200/80 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="p-3 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Students</span>
              <span className="text-xl font-black text-stone-900 mt-0.5 block">{dbStudentCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Teachers</span>
              <span className="text-xl font-black text-stone-900 mt-0.5 block">{dbTeacherCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Created</span>
              <span className="text-xs font-bold text-stone-800 mt-1 block">
                {new Date(tenant.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Prominent Action: Housing the Data Import Wizard */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportWizardOpen(true)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Launch Data Ingestion Wizard (Excel/CSV)</span>
            </button>
            <button
              type="button"
              onClick={() => loginAsRole('school_admin', undefined, tenant.id)}
              className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1 transition-colors"
              title="Login as School Admin"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Login</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-stone-100 flex items-center gap-6 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'overview' 
                ? 'border-[#1a56db] text-[#1a56db]' 
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            School Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'students' 
                ? 'border-[#1a56db] text-[#1a56db]' 
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Students</span>
            <span className="px-2 py-0.2 rounded-full text-[10px] bg-stone-100 font-mono">
              {dbStudentCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'teachers' 
                ? 'border-[#1a56db] text-[#1a56db]' 
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Teachers</span>
            <span className="px-2 py-0.2 rounded-full text-[10px] bg-stone-100 font-mono">
              {dbTeacherCount}
            </span>
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Institution Metadata Card */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    Administrative Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs font-bold text-[#1a56db] hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-stone-400 block">School Code</span>
                    <span className="font-mono font-bold text-stone-900">{tenant.subdomain}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Current Status</span>
                    <span className="font-bold text-stone-900 capitalize">{tenant.status}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Headmaster / Admin</span>
                    <span className="font-bold text-stone-900">{tenant.headmaster_name || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Contact Email</span>
                    <span className="font-bold text-stone-900 truncate block">{tenant.contact_email || 'Not provided'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-stone-400 block">Campus Address</span>
                    <span className="font-semibold text-stone-900">{tenant.address || 'No address specified'}</span>
                  </div>
                </div>
              </div>

              {/* Multi-Tenant Security Scope Notice */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#1a56db]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Row-Level Security (RLS) Tenant Isolation</span>
                </div>
                <p className="text-stone-600 leading-relaxed">
                  All students and teachers in this school are cryptographically bound to <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px] text-blue-900">{tenant.id}</code>. Super admins have global cross-tenant management privileges.
                </p>
              </div>

              {/* Quick Tenant Management Controls */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-2xs">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block border-b border-stone-100 pb-3">
                  Tenant Actions
                </span>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Power className={`w-4 h-4 ${tenant.status === 'active' ? 'text-amber-500' : 'text-emerald-500'}`} />
                    <span>{tenant.status === 'active' ? 'Deactivate School' : 'Activate School'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Delete Tenant</span>
                  </button>
                </div>

                {isConfirmingDelete && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-2 animate-in fade-in">
                    <p className="font-bold text-rose-900">
                      Are you sure you want to permanently delete "{tenant.name}"?
                    </p>
                    <p className="text-rose-700">
                      This will delete all student records, teacher records, and school allocations. This action cannot be reversed.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDeleteTenant}
                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                      >
                        Yes, Delete Permanently
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="px-4 py-1.5 rounded-lg border border-stone-200 hover:bg-white text-stone-600 font-bold text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search student by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-[#1a56db]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {dbStudentCount > 0 && (
                    <button
                      type="button"
                      disabled={isPurgingStudents}
                      onClick={handlePurgeStudents}
                      className="px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      title="Clear existing student records for this school"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isPurgingStudents ? 'Purging...' : 'Purge All'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsImportWizardOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#1a56db] text-white font-bold text-xs flex items-center gap-1.5 shrink-0 hover:bg-[#1e40af] transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Import Students</span>
                  </button>
                </div>
              </div>

              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider">Code / ID</th>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider">Full Name</th>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider">Gender</th>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-stone-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="w-8 h-8 text-stone-300" />
                            <p className="font-bold text-stone-700">No student records found</p>
                            <p className="text-stone-400 text-[11px] max-w-sm">
                              Upload student data using the Ingestion Wizard with automatic column detection, name splitting, and live validation.
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsImportWizardOpen(true)}
                              className="mt-2 px-4 py-1.5 rounded-xl bg-[#1a56db] text-white font-bold text-xs hover:bg-[#1e40af] transition-colors"
                            >
                              Launch Ingestion Wizard
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => {
                        const fullName = (s.first_name ? `${s.first_name} ${s.last_name || ''}` : s.full_name)?.trim();
                        return (
                          <tr key={s.id || idx} className="hover:bg-stone-50/50">
                            <td className="p-3 font-mono font-bold text-[#1a56db]">
                              {s.student_code || s.admission_number || `STU-${idx + 1}`}
                            </td>
                            <td className="p-3 font-semibold text-stone-900">
                              {fullName ? (
                                fullName
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  No Name Provided
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-stone-600">{s.gender || '—'}</td>
                            <td className="p-3 text-stone-600">{s.grade_level || '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: TEACHERS */}
          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search staff by name, code or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-[#1a56db]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {dbTeacherCount > 0 && (
                    <button
                      type="button"
                      disabled={isPurgingTeachers}
                      onClick={handlePurgeTeachers}
                      className="px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      title="Clear existing teacher records for this school"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isPurgingTeachers ? 'Purging...' : 'Purge All'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsImportWizardOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#1a56db] text-white font-bold text-xs flex items-center gap-1.5 shrink-0 hover:bg-[#1e40af] transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Import Teachers</span>
                  </button>
                </div>
              </div>

              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider">Staff Code</th>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider">Name</th>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider">Email</th>
                      <th className="p-3 font-bold text-stone-500 uppercase tracking-wider">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-stone-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <GraduationCap className="w-8 h-8 text-stone-300" />
                            <p className="font-bold text-stone-700">No teachers registered yet</p>
                            <p className="text-stone-400 text-[11px] max-w-sm">
                              Upload faculty rosters using the Ingestion Wizard with institutional email validation and automatic header matching.
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsImportWizardOpen(true)}
                              className="mt-2 px-4 py-1.5 rounded-xl bg-[#1a56db] text-white font-bold text-xs hover:bg-[#1e40af] transition-colors"
                            >
                              Launch Ingestion Wizard
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map((t, idx) => {
                        const fullName = (t.first_name ? `${t.first_name} ${t.last_name || ''}` : t.full_name)?.trim();
                        return (
                          <tr key={t.id || idx} className="hover:bg-stone-50/50">
                            <td className="p-3 font-mono font-bold text-[#1a56db]">
                              {t.staff_code || `TCH-${idx + 1}`}
                            </td>
                            <td className="p-3 font-semibold text-stone-900">
                              {fullName ? (
                                fullName
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  No Name Provided
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-stone-600 font-mono text-[11px]">{t.email || '—'}</td>
                            <td className="p-3 text-stone-600">{t.phone || '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Modals */}
      <SchoolImportWizard
        isOpen={isImportWizardOpen}
        onClose={() => {
          setIsImportWizardOpen(false);
          refreshCounts();
        }}
        tenantId={tenant.id}
        tenantName={tenant.name}
        onSuccess={() => {
          refreshCounts();
          onTenantUpdated?.();
        }}
      />

      <EditSchoolModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        tenant={tenant}
        onSave={(updated) => {
          updateTenant(tenant.id, updated);
          onTenantUpdated?.();
        }}
      />
    </>
  );
};
