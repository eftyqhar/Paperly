import React from 'react';

interface PaperlyLogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
}

export const PaperlyLogo: React.FC<PaperlyLogoProps> = ({
  className = '',
  showSubtitle = true,
  size = 'md',
  variant = 'full',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const subSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Paperly 3D Stylized Folded 'P' Logo Icon */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0 rounded-xl overflow-hidden shadow-sm shadow-blue-500/20`}>
        <img 
          src="/paperly-logo.jpg" 
          alt="Paperly Logo" 
          className="w-full h-full object-cover object-top scale-[1.35] translate-y-[2%]"
        />
      </div>

      {variant === 'full' && (
        <div className="flex flex-col leading-none text-left">
          <span className={`font-extrabold tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}>
            Paperly
          </span>
          {showSubtitle && (
            <span className={`font-medium tracking-wide text-slate-500 dark:text-slate-400 mt-0.5 ${subSizes[size]}`}>
              by{' '}
              <a
                href="https://deeplogic.agi.bd/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                title="Visit DeepLogic (https://deeplogic.agi.bd/)"
              >
                DeepLogic
              </a>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PaperlyLogo;
