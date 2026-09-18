import React from 'react';
import { 
  Building2, 
  LogOut, 
  X
} from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { EduvoraLogo } from '../common/EduvoraLogo';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  activeTab = 'institutions',
  setActiveTab 
}) => {
  const { logout, currentUser, allTenants } = useTenantAuth();

  const handleNavClick = (id: string) => {
    setActiveTab?.(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-stone-900/40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={clsx(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-stone-200/80 transition-transform duration-300 ease-in-out flex flex-col lg:translate-x-0 lg:sticky lg:top-0 lg:shrink-0",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-stone-100 justify-between">
          <div className="flex items-center gap-3 select-none">
            <EduvoraLogo size="sm" priority />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-stone-950 flex items-center">
                Edu<span className="text-[#1a56db]">vora</span>
              </span>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider -mt-1">
                {currentUser?.role?.replace('_', ' ') || 'User'}
              </span>
            </div>
          </div>
          <button 
            className="lg:hidden p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors" 
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-4">
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">
              Management
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => handleNavClick('institutions')}
                className={clsx(
                  "flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                  activeTab === 'institutions' 
                    ? "bg-[#1a56db]/10 text-[#1a56db] shadow-xs" 
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Building2 className={clsx("w-4.5 h-4.5 transition-colors", activeTab === 'institutions' ? "text-[#1a56db]" : "text-stone-400 group-hover:text-stone-700")} />
                  <span>Institutions</span>
                </div>
                {allTenants.length > 0 && (
                  <span className={clsx(
                    "px-2 py-0.5 text-xs font-bold rounded-full",
                    activeTab === 'institutions' ? "bg-[#1a56db] text-white" : "bg-stone-100 text-stone-600"
                  )}>
                    {allTenants.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/80 backdrop-blur-xs shrink-0 mt-auto sticky bottom-0 z-10">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white border border-stone-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1a56db] to-sky-400 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm">
              {currentUser?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-stone-900 truncate">
                {currentUser?.full_name || 'Dr. Kingsley Vance'}
              </div>
              <div className="text-[11px] font-medium text-stone-500 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {currentUser?.role?.replace('_', ' ') || 'User'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-bold text-stone-600 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors active:scale-[0.98] border border-transparent hover:border-rose-100"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
