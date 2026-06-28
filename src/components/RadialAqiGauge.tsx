import React from 'react';
import { motion } from 'motion/react';

interface RadialAqiGaugeProps {
  aqiValue: number;
  currentLevel: {
    label: string;
    description: string;
    color: string;
  };
}

export const RadialAqiGauge = React.memo(({ aqiValue, currentLevel }: RadialAqiGaugeProps) => {
  const cx = 200;
  const cy = 200;
  
  const outerRadius = 140;
  const innerRadius = 110;
  const tickRadius = 165;
  const strokeWidth = 18;

  const minVisual = 0;
  const maxVisual = 300; // Typically 0 to 300 covers standard high scale AQI ranges.
  
  const currentVal = Math.max(minVisual, Math.min(maxVisual, aqiValue || 0));
  const progressRatio = (currentVal - minVisual) / (maxVisual - minVisual);

  const startAngle = -120;
  const endAngle = 120;
  const totalAngle = 240;

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describeArc = (x: number, y: number, radius: number, startDegree: number, endDegree: number) => {
    const start = polarToCartesian(x, y, radius, startDegree);
    const end = polarToCartesian(x, y, radius, endDegree);
    const largeArcFlag = endDegree - startDegree <= 180 ? "0" : "1";

    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
    ].join(" ");
  };

  const tickCount = 40;
  const ticks = Array.from({ length: tickCount + 1 }).map((_, i) => {
    const ratio = i / tickCount;
    const angle = startAngle + (ratio * totalAngle); 
    const innerPoint = polarToCartesian(cx, cy, tickRadius, angle);
    const outerPoint = polarToCartesian(cx, cy, tickRadius + (i % 5 === 0 ? 8 : 3), angle);
    
    return (
      <line 
        key={i} 
        x1={innerPoint.x} y1={innerPoint.y} 
        x2={outerPoint.x} y2={outerPoint.y}
        stroke="#52b72c"
        strokeWidth={1.5}
        strokeOpacity={0.25}
        strokeLinecap="round"
      />
    );
  });

  const fullOuterArc = describeArc(cx, cy, outerRadius, startAngle, endAngle);
  const fullInnerArc = describeArc(cx, cy, innerRadius, startAngle, endAngle);

  return (
    <div className="relative flex flex-col items-center justify-center w-full pb-8">
      {/* Soft background green glow */}
      <div className="absolute inset-x-0 bottom-12 top-1/2 flex items-center justify-center pointer-events-none">
         <div className="w-56 h-56 bg-[#52b72c]/15 blur-[80px] rounded-full mix-blend-screen" />
      </div>

      <svg width="100%" height="auto" viewBox="0 0 400 290" className="overflow-visible z-10 relative" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="aqi-gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="aqi-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#edffde" />
            <stop offset="50%" stopColor="#52b72c" />
            <stop offset="100%" stopColor="#020402" />
          </linearGradient>
        </defs>

        {/* Ticks */}
        <g className="transition-opacity duration-700">
          {ticks}
        </g>
        
        {/* Background Tracks */}
        <path d={fullOuterArc} fill="none" stroke="#52b72c20" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={fullInnerArc} fill="none" stroke="#52b72c20" strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Progress Tracks */}
        <motion.path 
          d={fullOuterArc} 
          fill="none" 
          stroke="url(#aqi-gauge-gradient)" 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progressRatio }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          filter="url(#aqi-gauge-glow)"
        />
        <motion.path 
          d={fullInnerArc} 
          fill="none" 
          stroke="url(#aqi-gauge-gradient)" 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progressRatio }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      
      {/* Center Values */}
      <div className="absolute inset-x-0 top-[35%] md:top-[38%] flex flex-col items-center justify-center pointer-events-none z-20 text-center px-4">
        <span className="text-6xl md:text-7xl font-black tracking-tight text-white leading-none mb-1 drop-shadow-md">
          {aqiValue !== undefined ? Math.floor(aqiValue) : 0}
        </span>
        <span 
          className="text-[10px] md:text-xs font-black uppercase tracking-[0.15em] text-center leading-normal max-w-[200px]"
          style={{ color: currentLevel?.color || '#52b72c' }}
        >
          {currentLevel?.label || 'MONITORING'}
        </span>
      </div>
    </div>
  );
});
