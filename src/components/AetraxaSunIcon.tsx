import React from 'react';

interface AetraxaSunIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

export const AetraxaSunIcon: React.FC<AetraxaSunIconProps> = ({ 
  size, 
  className = '', 
  strokeWidth,
  ...props 
}) => {
  const hasTextColor = className.includes('text-');
  const defaultColorClass = hasTextColor ? '' : 'text-primary-accent';

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth ?? "2"} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={`${defaultColorClass} ${className}`}
      {...props}
    >
      {/* Dynamic thermal sun indicating high thermal hazard */}
      {/* Concentric high-heat thermal aura rings */}
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth={strokeWidth ?? "2"} />
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="opacity-75 animate-reverse-spin" style={{ transformOrigin: '12px 12px' }} />
      
      {/* 8 radiating high-heat flares */}
      <line x1="12" y1="2" x2="12" y2="4" stroke="currentColor" strokeWidth={strokeWidth ?? "2.2"} />
      <line x1="12" y1="20" x2="12" y2="22" stroke="currentColor" strokeWidth={strokeWidth ?? "2.2"} />
      <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth={strokeWidth ?? "2.2"} />
      <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth={strokeWidth ?? "2.2"} />
      
      {/* Diagonal flare rays */}
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth={strokeWidth ?? "2.2"} />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth={strokeWidth ?? "2.2"} />
      <line x1="19.07" y1="4.93" x2="17.66" y2="6.34" stroke="currentColor" strokeWidth={strokeWidth ?? "2.2"} />
      <line x1="6.34" y1="17.66" x2="4.93" y2="19.07" stroke="currentColor" strokeWidth={strokeWidth ?? "2.2"} />
    </svg>
  );
};
