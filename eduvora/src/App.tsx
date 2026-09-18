/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TenantAuthProvider, useTenantAuth } from './context/TenantAuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { LoginPage } from './components/auth/LoginPage';

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated, refreshTenants } = useTenantAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('institutions');
  const [isSyncing, setIsSyncing] = useState(false);

  // Send any unauthenticated user directly to the Login page
  if (!isAuthenticated || !currentUser) {
    return <LoginPage />;
  }

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    try {
      await refreshTenants?.();
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-stone-900 selection:bg-stone-950 selection:text-[#f6c042]">
      {/* Responsive Left Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <Navbar 
          toggleSidebar={() => setIsSidebarOpen(true)} 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSyncDatabase={handleGlobalSync}
          isSyncing={isSyncing}
        />

        {/* Main Role-Scoped Content View */}
        <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl 2xl:max-w-[1560px]">
          {currentUser.role === 'super_admin' && (
            <SuperAdminDashboard 
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <TenantAuthProvider>
      <AppContent />
    </TenantAuthProvider>
  );
}
