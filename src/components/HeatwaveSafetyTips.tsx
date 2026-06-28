import React from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets as DropletsIcon, 
  ThermometerSun as ThermometerSunIcon, 
  ShieldAlert as ShieldAlertIcon, 
  Activity as ActivityIcon 
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface HeatwaveSafetyTipsProps {
  heatIndex: number;
}

export const HeatwaveSafetyTips = React.memo(({ heatIndex }: HeatwaveSafetyTipsProps) => {
  const { language } = useLanguage();
  const isUr = language === 'ur';

  const getTips = (hi: number, isUrdu: boolean) => {
    if (hi >= 52) { // Critical
      return {
        level: isUrdu ? "انتہائی شدید ترین خطرہ" : "CRITICAL HAZARD",
        color: "text-violet-500",
        hydration: isUrdu ? "الیکٹرولائٹس کے ساتھ فی گھنٹہ 1 لیٹر پانی پیئیں۔" : "Drink 1 liter of water per hour with electrolytes.",
        shade: isUrdu ? "لازمی طور پر اے سی والے کمرے میں رہیں۔ باہر ہرگز مت جائیں۔" : "Absolute stay in A/C. Do not go outside.",
        symptoms: isUrdu ? "ہیٹ اسٹروک کا شدید ترین خطرہ۔ ذہنی الجھن اور دورے پڑنے کا خدشہ۔" : "High risk of heatstroke. Confusion/Seizures risk."
      };
    } else if (hi >= 45) { // Danger
      return {
        level: isUrdu ? "شدید خطرہ" : "DANGER",
        color: "text-fuchsia-500",
        hydration: isUrdu ? "ہر 15 منٹ میں 1 گلاس پانی پیئیں۔ چائے/کافی سے پرہیز کریں۔" : "Drink 1 glass every 15 mins. No alcohol/caffeine.",
        shade: isUrdu ? "اندرون خانہ رہیں۔ صرف صبح یا شام کے اوقات میں باہر نکلیں۔" : "Stay indoors. Limit dawn/dusk exposure only.",
        symptoms: isUrdu ? "شدید تھکن کا خطرہ۔ متلی یا چکر آنے کی علامات پر نظر رکھیں۔" : "High exhaustion risk. Watch for nausea/dizziness."
      };
    } else if (hi >= 39) { // Extreme
      return {
        level: isUrdu ? "شدید گرمی" : "EXTREME HEAT",
        color: "text-red-500",
        hydration: isUrdu ? "مسلسل پانی پیئیں۔ اور مسلسل اپنے پاس پانی رکھیں۔" : "Drink water consistently. Carry water everywhere.",
        shade: isUrdu ? "باہر کی سرگرمیاں ملتوی کریں۔ سایہ دار جگہوں پر پناہ لیں۔" : "Reschedule outdoor activities. Seek robust shade.",
        symptoms: isUrdu ? "کمزوری، پسینے سے تر جلد یا تیز کمزور نبض کی نگرانی کریں۔" : "Watch for weakness/clammy skin/fast weak pulse."
      };
    } else if (hi >= 34) { // Severe
      return {
        level: isUrdu ? "سخت گرمی" : "SEVERE HEAT",
        color: "text-red-400",
        hydration: isUrdu ? "زیادہ سے زیادہ پانی پیئیں۔ پیاس لگنے کا انتظار نہ کریں۔" : "Increase fluid intake. Drink before thirsty.",
        shade: isUrdu ? "سایہ دار یا ٹھنڈے علاقوں میں بار بار وقفہ لیں۔" : "Take frequent breaks in shaded/cooled zones.",
        symptoms: isUrdu ? "ہیٹ کریمپس کا خطرہ۔ پٹھوں کے اکڑنے پر نظر رکھیں۔" : "Possible heat cramps. Watch for muscle spasms."
      };
    } else if (hi >= 30) { // Caution
      return {
        level: isUrdu ? "معتدل احتیاط" : "MODERATE CAUTION",
        color: "text-orange-500",
        hydration: isUrdu ? "باقاعدگی سے پانی پیئیں اور پانی کی بوتل ساتھ رکھیں۔" : "Maintain regular hydration. Keep water handy.",
        shade: isUrdu ? "ڈھیلے کپڑے پہنیں۔ سن اسکرین اور ہیٹ استعمال کریں۔" : "Wear loose clothing. Use sunscreen and hats.",
        symptoms: isUrdu ? "زیادہ دیر کام کرنے سے جسمانی تھکن کا خدشہ۔" : "Fatigue is possible with prolonged activity."
      };
    } else { // Optimal & Moderate
      return {
        level: isUrdu ? "معمولی / متناسب" : "NOMINAL",
        color: "text-emerald-500",
        hydration: isUrdu ? "روزانہ پانی پینے کی عام مقدار برقرار رکھیں۔" : "Follow standard daily hydration guidelines.",
        shade: isUrdu ? "باہر کی سرگرمیاں جاری رکھیں۔ عام بچاؤ کافی ہے۔" : "Enjoy outdoor activities. Normal protection.",
        symptoms: isUrdu ? "گرمی سے متعلقہ کسی بیماری کا کوئی خاص خطرہ نہیں۔" : "Minimal risk of heat-related illness."
      };
    }
  };

  const tips = getTips(heatIndex, isUr);

  return (
    <div className="flex flex-col gap-4">
      <div className={`mb-4 flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10`}>
        <div className={`w-2 h-2 rounded-full bg-current ${tips.color} animate-pulse`} />
        <span className={`text-[10px] font-black tracking-widest uppercase ${tips.color}`}>{tips.level}</span>
      </div>

      <ProtocolItem 
        icon={<DropletsIcon className="w-4 h-4" />} 
        label={isUr ? "ہائیڈریشن / پانی" : "Hydration"} 
        body={tips.hydration} 
        color="text-blue-400" 
      />
      <ProtocolItem 
        icon={<ThermometerSunIcon className="w-4 h-4" />} 
        label={isUr ? "دھوپ سے بچاؤ" : "Exposure"} 
        body={tips.shade} 
        color="text-orange-400" 
      />
      <ProtocolItem 
        icon={<ActivityIcon className="w-4 h-4" />} 
        label={isUr ? "علامات" : "Symptoms"} 
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
