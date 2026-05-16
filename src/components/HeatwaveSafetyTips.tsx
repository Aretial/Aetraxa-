import React from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets as DropletsIcon, 
  ThermometerSun as ThermometerSunIcon, 
  ShieldAlert as ShieldAlertIcon, 
  Activity as ActivityIcon 
} from 'lucide-react';

interface HeatwaveSafetyTipsProps {
  heatIndex: number;
}

export const HeatwaveSafetyTips = React.memo(({ heatIndex }: HeatwaveSafetyTipsProps) => {
  const getTips = (hi: number) => {
    if (hi >= 52) { // Critical
      return {
        level: "CRITICAL HAZARD",
        color: "text-violet-500",
        hydration: "Drink 1 liter of water per hour with electrolytes.",
        shade: "Absolute stay in A/C. Do not go outside.",
        symptoms: "High risk of heatstroke. Confusion/Seizures risk."
      };
    } else if (hi >= 45) { // Danger
      return {
        level: "DANGER",
        color: "text-fuchsia-500",
        hydration: "Drink 1 glass every 15 mins. No alcohol/caffeine.",
        shade: "Stay indoors. Limit dawn/dusk exposure only.",
        symptoms: "High exhaustion risk. Watch for nausea/dizziness."
      };
    } else if (hi >= 39) { // Extreme
      return {
        level: "EXTREME HEAT",
        color: "text-red-500",
        hydration: "Drink water consistently. Carry water everywhere.",
        shade: "Reschedule outdoor activities. Seek robust shade.",
        symptoms: "Watch for weakness/clammy skin/fast weak pulse."
      };
    } else if (hi >= 34) { // Severe
      return {
        level: "SEVERE HEAT",
        color: "text-red-400",
        hydration: "Increase fluid intake. Drink before thirsty.",
        shade: "Take frequent breaks in shaded/cooled zones.",
        symptoms: "Possible heat cramps. Watch for muscle spasms."
      };
    } else if (hi >= 30) { // Caution
      return {
        level: "MODERATE CAUTION",
        color: "text-orange-500",
        hydration: "Maintain regular hydration. Keep water handy.",
        shade: "Wear loose clothing. Use sunscreen and hats.",
        symptoms: "Fatigue is possible with prolonged activity."
      };
    } else { // Optimal & Moderate
      return {
        level: "NOMINAL",
        color: "text-emerald-500",
        hydration: "Follow standard daily hydration guidelines.",
        shade: "Enjoy outdoor activities. Normal protection.",
        symptoms: "Minimal risk of heat-related illness."
      };
    }
  };

  const tips = getTips(heatIndex);

  return (
    <div className="flex flex-col gap-4">
      <div className={`mb-4 flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10`}>
        <div className={`w-2 h-2 rounded-full bg-current ${tips.color} animate-pulse`} />
        <span className={`text-[10px] font-black tracking-widest uppercase ${tips.color}`}>{tips.level}</span>
      </div>

      <ProtocolItem 
        icon={<DropletsIcon className="w-4 h-4" />} 
        label="Hydration" 
        body={tips.hydration} 
        color="text-blue-400" 
      />
      <ProtocolItem 
        icon={<ThermometerSunIcon className="w-4 h-4" />} 
        label="Exposure" 
        body={tips.shade} 
        color="text-orange-400" 
      />
      <ProtocolItem 
        icon={<ActivityIcon className="w-4 h-4" />} 
        label="Symptoms" 
        body={tips.symptoms} 
        color="text-red-500" 
      />
    </div>
  );
});

const ProtocolItem = ({ icon, label, body, color }: any) => (
  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2 hover:border-white/10 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-500">{label}</span>
    </div>
    <p className="text-[13px] text-stone-300 font-medium leading-relaxed">
      {body}
    </p>
  </div>
);
