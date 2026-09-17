import React from 'react';
import { EduvoraLogo } from '../common/EduvoraLogo';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 text-stone-900 transition-colors">
      <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 py-2 sm:py-3">
          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0">
            <div className="flex items-center gap-2 select-none shrink-0" title="Eduvora Platform">
              <EduvoraLogo size="sm" priority />
              <span className="text-xl sm:text-2xl font-black tracking-tight text-stone-950">
                Edu<span className="text-[#0284c7]">vora</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

