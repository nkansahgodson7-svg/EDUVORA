import React, { useState } from 'react';
import {
  ChevronDown,
  Building2,
  Database,
  KeyRound,
  Check,
  Search,
  School,
  Layers,
  UserCheck,
  Shield,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';
import { UserRole } from '../../types';
import { EduvoraLogo } from '../common/EduvoraLogo';

interface NavbarProps {
  onOpenInviteModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenInviteModal,
}) => {
  const {
    allTenants,
    currentTenant,
    currentUser,
    switchTenant,
    loginAsRole,
    logout,
  } = useTenantAuth();

  const [isTenantMenuOpen, setIsTenantMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'school_admin':
        return 'School Admin';
      case 'teacher':
        return 'Teacher';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 text-stone-900 transition-colors">
      <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 py-2 sm:py-3">
          {/* Brand & Subdomain Badge */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0">
            <div 
              onClick={() => loginAsRole('super_admin')}
              className="flex items-center gap-2 cursor-pointer select-none shrink-0"
              title="Eduvora Platform"
            >
              <EduvoraLogo size="sm" priority />
              <span className="text-xl sm:text-2xl font-black tracking-tight text-stone-950">
                Edu<span className="text-[#0284c7]">vora</span>
              </span>
            </div>

            {/* Clean Subdomain context tag (Large screens) */}
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-stone-200 text-xs text-stone-500 font-medium">
              <span>Tenant Scope:</span>
              <span className="font-mono text-[11px] font-semibold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
                {currentUser.role === 'super_admin' ? 'app.eduvora.io' : `${currentTenant.subdomain}.eduvora.io`}
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Desktop & Laptop screens >= 1024px) */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-8 text-xs font-semibold text-stone-600">
            <button
              onClick={() => loginAsRole('super_admin')}
              className={`transition-colors hover:text-black py-1 whitespace-nowrap ${currentUser.role === 'super_admin' ? 'text-black font-bold relative after:content-[\'\'] after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:bg-black after:rounded-full' : ''}`}
            >
              Platform Overview
            </button>
            <button
              onClick={() => loginAsRole('school_admin', undefined, currentTenant.id)}
              className={`transition-colors hover:text-black py-1 whitespace-nowrap ${currentUser.role === 'school_admin' ? 'text-black font-bold relative after:content-[\'\'] after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:bg-black after:rounded-full' : ''}`}
            >
              Institution Portal
            </button>
            <button
              onClick={() => loginAsRole('teacher', undefined, currentTenant.id)}
              className={`transition-colors hover:text-black py-1 whitespace-nowrap ${currentUser.role === 'teacher' ? 'text-black font-bold relative after:content-[\'\'] after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:bg-black after:rounded-full' : ''}`}
            >
              Grade Registers
            </button>
          </nav>

          {/* Right Action Controls (Desktop screens >= 1024px) */}
          <div className="hidden lg:flex items-center gap-2.5 xl:gap-3 shrink-0">
            {/* Institution Switcher Dropdown */}
            {currentUser.role !== 'super_admin' && (
              <div className="relative">
                <button
                  onClick={() => setIsTenantMenuOpen(!isTenantMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-800 transition-all"
                >
                  <Building2 className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span className="max-w-[110px] xl:max-w-[140px] truncate">{currentTenant.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                </button>

                {isTenantMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-stone-100 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Switch Institution
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {allTenants.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            switchTenant(t.id);
                            setIsTenantMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between hover:bg-stone-50 transition-colors ${
                            t.id === currentTenant.id ? 'bg-stone-50 text-black font-bold' : 'text-stone-700'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-stone-900">{t.name}</div>
                            <div className="text-[11px] text-stone-400 font-mono">{t.subdomain}.eduvora.io</div>
                          </div>
                          {t.id === currentTenant.id && (
                            <span className="w-2 h-2 rounded-full bg-[#f6c042]"></span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Authenticated User Profile & Role Menu */}
            <div className="relative">
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-stone-200 bg-white hover:border-stone-300 text-stone-900 text-xs font-semibold transition-all shadow-xs"
              >
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name}
                    className="w-6 h-6 rounded-full object-cover border border-stone-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#1a56db] text-white font-bold text-[10px] flex items-center justify-center">
                    {currentUser.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="font-bold leading-tight max-w-[120px] truncate">{currentUser.full_name}</span>
                  <span className="text-[10px] text-stone-400 font-medium leading-none">{getRoleLabel(currentUser.role)}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 ml-0.5" />
              </button>

              {isRoleMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 py-3 z-50 animate-in fade-in zoom-in-95">
                  {/* Account Header */}
                  <div className="px-4 pb-3 border-b border-stone-100 flex items-center gap-3">
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.full_name}
                        className="w-10 h-10 rounded-full object-cover border border-stone-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#1a56db] text-white font-bold text-sm flex items-center justify-center">
                        {currentUser.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-stone-900 truncate">{currentUser.full_name}</div>
                      <div className="text-xs text-stone-400 font-mono truncate">{currentUser.email}</div>
                      <div className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                        {getRoleLabel(currentUser.role)}
                      </div>
                    </div>
                  </div>

                  {/* Workspace Roles */}
                  <div className="px-4 pt-3 pb-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Authorized Workspaces
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        loginAsRole('super_admin');
                        setIsRoleMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-stone-50"
                    >
                      <div>
                        <div className="font-bold text-stone-900">Super Admin Workspace</div>
                        <div className="text-[11px] text-stone-500">Multi-tenant institutional governance</div>
                      </div>
                      {currentUser.role === 'super_admin' && <Check className="w-4 h-4 text-blue-600" />}
                    </button>

                    <button
                      onClick={() => {
                        loginAsRole('school_admin', undefined, currentTenant.id);
                        setIsRoleMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-stone-50"
                    >
                      <div>
                        <div className="font-bold text-stone-900">Principal / Registrar Portal</div>
                        <div className="text-[11px] text-stone-500">Approvals, allocations & reports</div>
                      </div>
                      {currentUser.role === 'school_admin' && <Check className="w-4 h-4 text-blue-600" />}
                    </button>

                    <button
                      onClick={() => {
                        loginAsRole('teacher', undefined, currentTenant.id);
                        setIsRoleMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-stone-50"
                    >
                      <div>
                        <div className="font-bold text-stone-900">Teacher Grade Registers</div>
                        <div className="text-[11px] text-stone-500">Continuous assessments & mark entries</div>
                      </div>
                      {currentUser.role === 'teacher' && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  </div>

                  {/* Quick Sign Out inside Popover */}
                  <div className="pt-2 mt-2 border-t border-stone-100 px-3">
                    <button
                      onClick={() => {
                        logout();
                        setIsRoleMenuOpen(false);
                      }}
                      className="w-full py-2 px-3 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out from Institution</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout / Exit Session Button */}
            <button
              onClick={logout}
              className="p-2 sm:px-3 sm:py-2 rounded-full border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-stone-600 hover:text-stone-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              title="Sign Out to Login Screen"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
