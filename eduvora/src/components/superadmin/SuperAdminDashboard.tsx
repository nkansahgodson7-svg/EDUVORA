import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, 
  Plus, 
  School, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  Search,
  UploadCloud,
  Edit2,
  Power,
  Users,
  GraduationCap,
  Calendar,
  Code2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { isUUID } from '../../utils/validation';
import { CreateSchoolWizard } from './CreateSchoolWizard';
import { SchoolDetailDrawer } from './SchoolDetailDrawer';
import { SchoolImportWizard } from './SchoolImportWizard';
import { EditSchoolModal } from './EditSchoolModal';
import { NukeDatabaseModal } from './NukeDatabaseModal';
import { Tenant } from '../../types';
import { SUPABASE_INGESTION_SQL } from '../../lib/supabaseSchema';

interface SuperAdminDashboardProps {
  searchQuery?: string;
  onClearSearch?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ 
  searchQuery = '',
  onClearSearch 
}) => {
  const { allTenants, loginAsRole, refreshTenants, updateTenant, deleteTenant, tenantStudents, availableTeachers } = useTenantAuth();

  // Modals & Drawers
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isNukeModalOpen, setIsNukeModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Selected School for Detail Drawer
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Quick Action Modals
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [tenantToImport, setTenantToImport] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  // Tenant Counts cache
  const [countsBySchoolId, setCountsBySchoolId] = useState<Record<string, { students: number; teachers: number }>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch counts for all schools
  const fetchAllSchoolCounts = useCallback(async () => {
    const countsMap: Record<string, { students: number; teachers: number }> = {};

    // First populate from local state fallback
    allTenants.forEach((tenant) => {
      const sCount = tenantStudents.filter((s) => s.school_id === tenant.id).length;
      const tCount = availableTeachers.filter((t) => t.school_id === tenant.id).length;
      countsMap[tenant.id] = { students: sCount, teachers: tCount };
    });

    // Query Supabase for cloud counts for UUIDs
    try {
      const uuidSchools = allTenants.filter((t) => isUUID(t.id));
      if (uuidSchools.length > 0) {
        await Promise.all(
          uuidSchools.map(async (t) => {
            try {
              const [{ count: sCount }, { count: tCount }] = await Promise.all([
                supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', t.id),
                supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', t.id),
              ]);
              countsMap[t.id] = {
                students: sCount !== null && sCount !== undefined ? sCount : countsMap[t.id]?.students || 0,
                teachers: tCount !== null && tCount !== undefined ? tCount : countsMap[t.id]?.teachers || 0,
              };
            } catch {
              // Ignore single school query error
            }
          })
        );
      }
    } catch (err) {
      console.warn('Error fetching counts from Supabase:', err);
    }

    setCountsBySchoolId(countsMap);
  }, [allTenants, tenantStudents, availableTeachers]);

  useEffect(() => {
    refreshTenants?.();
    fetchAllSchoolCounts();
  }, [refreshTenants, fetchAllSchoolCounts]);

  const handleSync = async () => {
    setIsRefreshing(true);
    try {
      await refreshTenants?.();
      await fetchAllSchoolCounts();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Quick Action: Toggle Active Status
  const handleToggleStatus = (tenant: Tenant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextStatus = tenant.status === 'active' ? 'inactive' : 'active';
    updateTenant(tenant.id, { status: nextStatus });
  };

  // Quick Action: Confirm Delete
  const handleConfirmDelete = () => {
    if (!tenantToDelete) return;
    deleteTenant(tenantToDelete.id);
    if (selectedTenantId === tenantToDelete.id) {
      setSelectedTenantId(null);
    }
    setTenantToDelete(null);
    fetchAllSchoolCounts();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_INGESTION_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  // Filter institutions based on search query
  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allTenants;
    return allTenants.filter((tenant) => 
      tenant.name.toLowerCase().includes(q) ||
      tenant.subdomain.toLowerCase().includes(q) ||
      (tenant.headmaster_name && tenant.headmaster_name.toLowerCase().includes(q)) ||
      (tenant.contact_email && tenant.contact_email.toLowerCase().includes(q))
    );
  }, [allTenants, searchQuery]);

  return (
    <>
      {allTenants.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center h-full min-h-[72vh] px-4 py-12">
          <div className="max-w-md w-full text-center flex flex-col items-center">
            <div className="relative flex justify-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-white shadow-xl shadow-blue-500/10 border border-blue-100 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-[#1a56db]" />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight">
                No Schools Provisioned Yet
              </h2>
              <p className="text-sm text-stone-500 mt-3 font-normal max-w-[340px] mx-auto leading-relaxed">
                Your multi-tenant administrative workspace is ready. Provision your first school tenant or ingest real data from Excel.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
              <button
                type="button"
                onClick={() => setIsProvisionModalOpen(true)}
                className="py-3 px-6 rounded-2xl bg-[#1a56db] hover:bg-[#1e40af] text-white font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Provision New School</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(true)}
                className="py-3 px-6 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Code2 className="w-4 h-4 text-stone-500" />
                <span>View Supabase SQL & RLS</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active Institutions Overview Table */
        <div className="flex flex-col gap-6 pb-12">
          
          {/* Header & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  Active Schools Overview
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-black bg-blue-100 text-[#1a56db] rounded-full">
                  {filteredTenants.length} {filteredTenants.length === 1 ? 'school' : 'schools'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Multi-tenant database records with Row-Level Security isolation & bulk Excel ingestion engine.
              </p>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5"
                title="View Supabase SQL setup & RLS policies"
              >
                <Code2 className="w-4 h-4 text-stone-500" />
                <span>SQL & RLS</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNukeModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5"
                title="Wipe database and start fresh"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Nuke Database</span>
              </button>

              <button
                type="button"
                onClick={handleSync}
                disabled={isRefreshing}
                className="px-3.5 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5"
                title="Sync schools with cloud database"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#1a56db]' : 'text-stone-500'}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync DB'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProvisionModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Provision New School</span>
              </button>
            </div>
          </div>

          {/* Search feedback notice */}
          {searchQuery && (
            <div className="flex items-center justify-between px-4 py-2 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
              <span>
                Search filter: <strong>"{searchQuery}"</strong> ({filteredTenants.length} matching)
              </span>
              <button 
                onClick={onClearSearch}
                className="text-blue-600 hover:text-blue-800 font-bold underline"
              >
                Clear
              </button>
            </div>
          )}

          {/* Data Table: Name, Code, Status Badge, Total Students count, Total Teachers count, Creation Date, Actions */}
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[840px]">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200/80">
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">School Name</th>
                    <th className="px-4 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-stone-500 uppercase tracking-wider">Students</th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-stone-500 uppercase tracking-wider">Teachers</th>
                    <th className="px-4 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Created Date</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-stone-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="w-8 h-8 text-stone-300" />
                          <p className="text-sm font-semibold text-stone-700">No schools found matching "{searchQuery}"</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => {
                      const counts = countsBySchoolId[tenant.id] || { students: 0, teachers: 0 };
                      const isInactive = tenant.status === 'inactive' || tenant.status === 'suspended';

                      return (
                        <tr
                          key={tenant.id}
                          className="hover:bg-stone-50/70 transition-colors group cursor-pointer"
                          onClick={() => setSelectedTenantId(tenant.id)}
                        >
                          {/* Column 1: School Name & Address */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center shrink-0 group-hover:border-blue-200 transition-colors">
                                <School className="w-5 h-5 text-stone-400 group-hover:text-[#1a56db] transition-colors" />
                              </div>
                              <div>
                                <div className="font-bold text-stone-900 group-hover:text-[#1a56db] transition-colors text-sm">
                                  {tenant.name}
                                </div>
                                <div className="text-xs text-stone-500 max-w-[200px] truncate">
                                  {tenant.address || 'No location set'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Code */}
                          <td className="px-4 py-4">
                            <span className="font-mono text-xs font-semibold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 group-hover:bg-blue-50 group-hover:text-blue-900 transition-colors">
                              {tenant.subdomain}
                            </span>
                          </td>

                          {/* Column 3: Status Badge */}
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              tenant.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {tenant.status}
                            </span>
                          </td>

                          {/* Column 4: Total Students Count */}
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-blue-50/60 text-blue-900 font-mono font-bold text-xs">
                              <Users className="w-3 h-3 mr-1 text-[#1a56db]" />
                              <span>{counts.students}</span>
                            </div>
                          </td>

                          {/* Column 5: Total Teachers Count */}
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-50/60 text-emerald-900 font-mono font-bold text-xs">
                              <GraduationCap className="w-3 h-3 mr-1 text-emerald-600" />
                              <span>{counts.teachers}</span>
                            </div>
                          </td>

                          {/* Column 6: Creation Date */}
                          <td className="px-4 py-4">
                            <span className="text-xs text-stone-600 font-medium">
                              {new Date(tenant.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Column 7: Quick Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {/* Action: Data Ingestion Wizard */}
                              <button
                                type="button"
                                onClick={() => setTenantToImport(tenant)}
                                className="p-1.5 rounded-lg border border-stone-200 hover:bg-blue-50 hover:text-[#1a56db] hover:border-blue-200 text-stone-500 transition-colors"
                                title="Ingest Excel/CSV Data"
                              >
                                <UploadCloud className="w-4 h-4" />
                              </button>

                              {/* Action: Edit School Details */}
                              <button
                                type="button"
                                onClick={() => setTenantToEdit(tenant)}
                                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                                title="Edit School Details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Action: Toggle Active Status */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleStatus(tenant, e)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  tenant.status === 'active' 
                                    ? 'border-stone-200 hover:bg-amber-50 text-stone-500 hover:text-amber-600' 
                                    : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'
                                }`}
                                title={tenant.status === 'active' ? 'Deactivate School' : 'Activate School'}
                              >
                                <Power className="w-4 h-4" />
                              </button>

                              {/* Action: Delete Tenant */}
                              <button
                                type="button"
                                onClick={() => setTenantToDelete(tenant)}
                                className="p-1.5 rounded-lg border border-stone-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-stone-500 transition-colors"
                                title="Delete Tenant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              {/* Action: Login as School Admin */}
                              <button
                                type="button"
                                onClick={() => loginAsRole('school_admin', undefined, tenant.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-[#1a56db] hover:text-white text-stone-700 font-bold text-xs transition-colors flex items-center gap-1"
                                title="Login as School Master Admin"
                              >
                                <span>Login</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Side-Panel School Detail Drawer */}
      <SchoolDetailDrawer
        isOpen={Boolean(selectedTenantId)}
        onClose={() => setSelectedTenantId(null)}
        tenantId={selectedTenantId}
        onTenantUpdated={() => {
          refreshTenants?.();
          fetchAllSchoolCounts();
        }}
        onTenantDeleted={() => {
          refreshTenants?.();
          fetchAllSchoolCounts();
        }}
      />

      {/* Provision New School Wizard */}
      <CreateSchoolWizard 
        isOpen={isProvisionModalOpen} 
        onClose={() => {
          setIsProvisionModalOpen(false);
          refreshTenants?.();
          fetchAllSchoolCounts();
        }} 
      />

      {/* Direct Data Import Wizard */}
      {tenantToImport && (
        <SchoolImportWizard
          isOpen={Boolean(tenantToImport)}
          onClose={() => {
            setTenantToImport(null);
            fetchAllSchoolCounts();
          }}
          tenantId={tenantToImport.id}
          tenantName={tenantToImport.name}
          onSuccess={() => {
            fetchAllSchoolCounts();
          }}
        />
      )}

      {/* Edit School Details Modal */}
      {tenantToEdit && (
        <EditSchoolModal
          isOpen={Boolean(tenantToEdit)}
          onClose={() => setTenantToEdit(null)}
          tenant={tenantToEdit}
          onSave={(updated) => {
            updateTenant(tenantToEdit.id, updated);
            refreshTenants?.();
            setTenantToEdit(null);
          }}
        />
      )}

      {/* Delete Tenant Confirmation Dialog */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">Delete Tenant School</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Are you sure you want to permanently delete <strong>"{tenantToDelete.name}"</strong>? This will remove all student, teacher, and assessment records permanently under Supabase RLS.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTenantToDelete(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Supabase SQL & RLS Policies Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-[#1a56db]" />
                <div>
                  <h3 className="text-sm font-black text-stone-900">Phase 1: Supabase SQL Setup & RLS Policies</h3>
                  <p className="text-xs text-stone-500">PostgreSQL DDL for schools, profiles, students, teachers & RLS</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-lg bg-[#1a56db] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{sqlCopied ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-stone-200 text-stone-400 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto bg-stone-950 text-stone-200 font-mono text-xs">
              <pre className="whitespace-pre-wrap">{SUPABASE_INGESTION_SQL}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Nuke Database Modal */}
      <NukeDatabaseModal 
        isOpen={isNukeModalOpen} 
        onClose={() => setIsNukeModalOpen(false)} 
      />
    </>
  );
};
