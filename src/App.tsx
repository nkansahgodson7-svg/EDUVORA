/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TenantAuthProvider, useTenantAuth } from './context/TenantAuthContext';
import { Navbar } from './components/layout/Navbar';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { SchoolAdminDashboard } from './components/schooladmin/SchoolAdminDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { InviteRedemptionModal } from './components/auth/InviteRedemptionModal';
import { LoginPage } from './components/auth/LoginPage';
import { EduvoraLogo } from './components/common/EduvoraLogo';

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated } = useTenantAuth();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Send any unauthenticated user directly to the Login page
  if (!isAuthenticated || !currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-stone-900 flex flex-col selection:bg-stone-950 selection:text-[#f6c042]">
      {/* Top Navigation Bar with Multi-Tenant & Role Switcher */}
      <Navbar
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
      />

      {/* Main Role-Scoped Content View */}
      <main className="flex-1 max-w-7xl 2xl:max-w-[1560px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentUser.role === 'super_admin' && (
          <SuperAdminDashboard />
        )}

        {currentUser.role === 'school_admin' && (
          <SchoolAdminDashboard />
        )}

        {currentUser.role === 'teacher' && (
          <TeacherDashboard />
        )}
      </main>

      {/* Global Modals */}
      <InviteRedemptionModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
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
