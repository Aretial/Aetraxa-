import React from 'react';

interface AetraxaSunIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const AetraxaSunIcon: React.FC<AetraxaSunIconProps> = ({ 
  size, 
  className = '', 
  strokeWidth,
  ...props 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 32 32" 
      width={size} 
      height={size} 
      className={`fill-current text-primary-accent ${className}`}
      {...props}
    >
      {/* Central ring */}
      <circle 
        cx="16" 
        cy="16" 
        r="4.25" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth={strokeWidth ?? "2.5"} 
      />
      {/* 8 symmetric capsule/pill rays rotated about the center (16,16) */}
      <rect x="14.8" y="4" width="2.4" height="5" rx="1.2" fill="currentColor" />
      <rect x="14.8" y="4" width="2.4" height="5" rx="1.2" transform="rotate(45 16 16)" fill="currentColor" />
      <rect x="14.8" y="4" width="2.4" height="5" rx="1.2" transform="rotate(90 16 16)" fill="currentColor" />
      <rect x="14.8" y="4" width="2.4" height="5" rx="1.2" transform="rotate(135 16 16)" fill="currentColor" />
      <rect x="14.8" y="4" width="2.4" height="5" rx="1.2" transform="rotate(180 16 16)" fill="currentColor" />
      <rect x="14.8" y="4" width="2.4" height="5" rx="1.2" transform="rotate(225 16 16)" fill="currentColor" />
      <rect x="14.8" y="4" width="2.4" height="5" rx="1.2" transform="rotate(270 16 16)" fill="currentColor" />
      <rect x="14.8" y="4" width="2.4" height="5" rx="1.2" transform="rotate(315 16 16)" fill="currentColor" />
    </svg>
  );
};
