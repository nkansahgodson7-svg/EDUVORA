import React from 'react';
import { Plus, Building2 } from 'lucide-react';
import { EduvoraLogo } from '../common/EduvoraLogo';

interface SuperAdminDashboardProps {}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = () => {
  return (
    <div className="w-full min-h-[calc(100vh-140px)] flex items-center justify-center">
      <div className="max-w-[480px] w-full p-8 sm:p-12 bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-200 text-center">
        
        {/* Subtle Decorative Background & Logo */}
        <div className="relative flex justify-center mb-8">
          <div className="absolute inset-0 flex items-center justify-center -top-8 -bottom-8">
            <div
              className="w-48 h-32 opacity-40"
              style={{
                backgroundImage: 'radial-gradient(#93c5fd 1.2px, transparent 1.2px)',
                backgroundSize: '14px 14px',
              }}
            />
          </div>
          
          <div className="relative z-10 p-3 rounded-2xl bg-white shadow-xl shadow-sky-500/15 border border-sky-100 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-[#0284c7]" strokeWidth={1.5} />
          </div>
        </div>

        {/* Headline & Description */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight mb-3">
          No Schools Yet
        </h2>
        <p className="text-sm text-stone-500 mb-10 leading-relaxed max-w-[320px] mx-auto font-medium">
          Your Eduvora platform is empty. Create your first school tenant to start managing institutions.
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => {
            // No-op for now as requested
            console.log('Add New School clicked');
          }}
          className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-[#1a56db] hover:bg-[#1e40af] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add New School</span>
        </button>
      </div>
    </div>
  );
};
