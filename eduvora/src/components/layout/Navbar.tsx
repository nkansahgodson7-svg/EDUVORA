import React from 'react';
import { EduvoraLogo } from '../common/EduvoraLogo';
import { Menu, Search, RefreshCw, X } from 'lucide-react';
import { useTenantAuth } from '../../context/TenantAuthContext';

interface NavbarProps {
  toggleSidebar?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSyncDatabase?: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  toggleSidebar, 
  searchQuery = '', 
  onSearchChange,
  onSyncDatabase,
  isSyncing = false 
}) => {
  const { currentUser } = useTenantAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-4">
          {/* Left: Mobile Menu & Search */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
            {toggleSidebar && (
              <button 
                onClick={toggleSidebar}
                className="lg:hidden p-2.5 -ml-2 text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
                aria-label="Toggle Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Mobile Logo */}
            <div className="flex items-center gap-2 select-none shrink-0 lg:hidden">
              <EduvoraLogo size="sm" priority />
            </div>

            {/* Desktop / Tablet Search Input (Inspired by reference) */}
            <div className="relative w-full max-w-md hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search institutions, subdomains, admins..."
                className="w-full pl-10 pr-9 py-2.5 bg-stone-50/80 hover:bg-stone-100/70 focus:bg-white text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 rounded-full border border-stone-200/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#1a56db] transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Action Controls & User Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sync Database Button */}
            {onSyncDatabase && (
              <button
                type="button"
                onClick={onSyncDatabase}
                disabled={isSyncing}
                title="Sync database from Supabase cloud"
                className="hidden sm:flex items-center gap-1.5 p-2.5 text-stone-500 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-full border border-stone-200/70 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#1a56db]' : ''}`} />
              </button>
            )}

            {/* Divider */}
            <div className="h-6 w-px bg-stone-200 hidden sm:block mx-1" />

            {/* User Profile Pill (Inspired by reference) */}
            <div className="flex items-center gap-3 pl-1 sm:pl-2 py-1 pr-1.5 sm:pr-3 rounded-full bg-white border border-stone-200/80 shadow-2xs">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#1a56db] to-sky-400 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs border border-white">
                {currentUser?.full_name?.charAt(0) || 'D'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-stone-900 leading-tight">
                  {currentUser?.full_name || 'Dr. Kingsley Vance'}
                </span>
                <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  {currentUser?.role?.replace('_', ' ') || 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar Row (When on small screens) */}
        <div className="sm:hidden pb-3 pt-1">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-stone-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search institutions, codes..."
              className="w-full pl-9 pr-8 py-2 bg-stone-50 text-xs text-stone-900 placeholder:text-stone-400 rounded-full border border-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
