import React from 'react';

interface EduvoraLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
  priority?: boolean;
}

export const EduvoraLogo: React.FC<EduvoraLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  textClassName = '',
  priority = false,
}) => {
  // Pre-calculated pixel dimensions with explicit width & height to prevent CLS
  const getDimensions = (): { dim: number; sizeClass: string; textClass: string } => {
    if (typeof size === 'number') {
      return { dim: size, sizeClass: '', textClass: 'text-base' };
    }
    switch (size) {
      case 'xs':
        return { dim: 20, sizeClass: 'w-5 h-5', textClass: 'text-xs' };
      case 'sm':
        return { dim: 28, sizeClass: 'w-7 h-7', textClass: 'text-sm' };
      case 'md':
        return { dim: 36, sizeClass: 'w-9 h-9', textClass: 'text-lg' };
      case 'lg':
        return { dim: 48, sizeClass: 'w-12 h-12', textClass: 'text-2xl' };
      case 'xl':
        return { dim: 64, sizeClass: 'w-16 h-16', textClass: 'text-3xl' };
      default:
        return { dim: 36, sizeClass: 'w-9 h-9', textClass: 'text-lg' };
    }
  };

  const { dim, sizeClass, textClass } = getDimensions();
  const styleObj = typeof size === 'number' ? { width: `${dim}px`, height: `${dim}px` } : undefined;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* High Performance Compressed Picture with WebP and fallback */}
      <div
        className={`relative overflow-hidden rounded-xl shadow-xs shrink-0 flex items-center justify-center ${sizeClass}`}
        style={styleObj}
      >
        <picture>
          {/* Compressed ultra-lightweight WebP (< 4 KB, 98%+ compression) */}
          <source
            srcSet={dim <= 36 ? '/eduvora-logo-sm.webp' : '/eduvora-logo.webp'}
            type="image/webp"
          />
          {/* High compatibility PNG fallback */}
          <img
            src="/eduvora-logo.png"
            alt="Eduvora Logo"
            width={dim}
            height={dim}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-xl"
          />
        </picture>
      </div>

      {showText && (
        <span className={`font-black tracking-tight text-stone-950 ${textClass} ${textClassName}`}>
          Edu<span className="text-[#0284c7]">vora</span>
        </span>
      )}
    </div>
  );
};

export default EduvoraLogo;
