/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TenantAuthProvider, useTenantAuth } from './context/TenantAuthContext';
import { Navbar } from './components/layout/Navbar';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { LoginPage } from './components/auth/LoginPage';

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated } = useTenantAuth();

  // Send any unauthenticated user directly to the Login page
  if (!isAuthenticated || !currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-stone-900 flex flex-col selection:bg-stone-950 selection:text-[#f6c042]">
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Role-Scoped Content View */}
      <main className="flex-1 max-w-7xl 2xl:max-w-[1560px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentUser.role === 'super_admin' && (
          <SuperAdminDashboard />
        )}
      </main>
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
