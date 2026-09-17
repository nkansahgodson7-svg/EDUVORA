import React, { useState } from 'react';
import { Building2, Plus, ChevronRight, School, ExternalLink } from 'lucide-react';
import { AddSchoolModal } from './AddSchoolModal';
import { SchoolDetails } from './SchoolDetails';
import { useTenantAuth } from '../../context/TenantAuthContext';

export const SuperAdminDashboard: React.FC = () => {
  const { allTenants, loginAsRole } = useTenantAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  if (selectedTenantId) {
    return <SchoolDetails tenantId={selectedTenantId} onBack={() => setSelectedTenantId(null)} />;
  }

  return (
    <>
      {allTenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[75vh] px-4">
          <div className="max-w-md w-full text-center flex flex-col items-center">
            {/* Visual Icon Badge (matching LoginPage) */}
            <div className="relative flex justify-center mb-8">
              <div className="absolute inset-0 flex items-center justify-center -top-6 -bottom-6">
                <div
                  className="w-40 h-28 opacity-40"
                  style={{
                    backgroundImage: 'radial-gradient(#93c5fd 1.2px, transparent 1.2px)',
                    backgroundSize: '14px 14px',
                  }}
                />
              </div>
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-white shadow-xl shadow-sky-500/15 border border-sky-100 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-[#1a56db]" />
              </div>
            </div>

            {/* Headline & Description */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight">
                No Schools Provisioned
              </h2>
              <p className="text-sm text-stone-500 mt-3 font-normal max-w-[320px] mx-auto">
                Your management platform is currently empty. Get started by setting up your first institutional workspace.
              </p>
            </div>

            {/* Primary CTA Button (matching LoginPage submit button) */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto min-w-[240px] min-h-[48px] py-3 px-6 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add New School</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full py-4 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Active Institutions</h1>
              <p className="text-sm text-stone-500 mt-1">Manage and provision school workspaces across your platform.</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Provision School</span>
            </button>
          </div>

          {/* Table List View */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Institution</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Subdomain Scope</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Administration</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {allTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTenantId(tenant.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {tenant.logo_url ? (
                              <img src={tenant.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <School className="w-5 h-5 text-stone-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 group-hover:text-[#1a56db] transition-colors">{tenant.name}</div>
                            <div className="text-xs text-stone-500 mt-0.5 max-w-[200px] truncate">{tenant.address || 'No location set'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200 inline-block">
                          {tenant.subdomain}.eduvora.io
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-stone-900">{tenant.headmaster_name || 'System Admin'}</div>
                        <div className="text-xs text-stone-500 mt-0.5">{tenant.contact_email || 'No email provided'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/60' : 'bg-rose-100 text-rose-700 border border-rose-200/60'
                        }`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              loginAsRole('school_admin', undefined, tenant.id);
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-stone-600 bg-stone-100 hover:bg-[#1a56db] hover:text-white transition-all shadow-sm group-hover:shadow-[#1a56db]/20 text-xs font-bold gap-1.5"
                            title="Login as Admin"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Login</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AddSchoolModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

