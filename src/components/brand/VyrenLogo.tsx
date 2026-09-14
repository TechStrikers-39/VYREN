import React from 'react';

export interface VyrenLogoProps {
  className?: string;
  symbolOnly?: boolean;
  variant?: 'navy' | 'white';
  size?: 'sm' | 'md' | 'lg';
}

export const VyrenLogo: React.FC<VyrenLogoProps> = ({
  className = '',
  symbolOnly = false,
  variant = 'navy',
  size = 'md'
}) => {
  const textColor = variant === 'white' ? 'text-on-primary' : 'text-primary-navy';
  const symbolSrc = variant === 'white' ? '/brand/vyren-symbol-dark.png' : '/brand/vyren-symbol.png';

  const symbolSizes = {
    sm: 'h-6',
    md: 'h-7',
    lg: 'h-9'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={symbolSrc}
        alt="VYREN Symbol"
        className={`${symbolSizes[size]} w-auto shrink-0 object-contain block`}
      />
      {!symbolOnly && (
        <span className={`font-bold tracking-[0.02em] ${textSizes[size]} ${textColor} leading-none`}>
          VYREN
        </span>
      )}
    </div>
  );
};

export default VyrenLogo;
