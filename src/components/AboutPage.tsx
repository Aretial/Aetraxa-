import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft as ArrowLeftIcon, 
  Info as InfoIcon, 
  ShieldAlert as ShieldAlertIcon, 
  Activity as ActivityIcon, 
  Globe as EarthIcon
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface AboutPageProps {
  onBack: () => void;
}

export const AboutPage = React.memo(({ onBack }: AboutPageProps) => {
  const { t } = useLanguage();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-6xl mx-auto px-6 pt-32 pb-24 flex flex-col gap-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-black/80 backdrop-blur-md border border-white/5 rounded-[3rem] p-6 sm:p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-accent/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="flex items-center gap-4 md:gap-6 relative z-10">
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,242,212,0.1)' }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-3.5 md:p-4 rounded-2xl bg-white/5 border border-white/10 text-white transition-all flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
          </motion.button>
          <div className="space-y-1">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none">{t('aboutTitle')}</h2>
            <p className="text-xs md:text-xl uppercase font-black tracking-widest text-primary-accent mt-2">{t('aboutSubtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-black/80 backdrop-blur-md border border-white/5 rounded-[3rem] p-6 sm:p-10 md:p-14 flex flex-col gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-accent/5 blur-[100px] rounded-full -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50" />
          
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 text-primary-accent">
              <InfoIcon className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">{t('whatIsAetraxaTitle')}</h3>
          </div>
          
          <p className="text-base font-medium text-white/40 leading-relaxed text-justify md:text-left">
            {t('whatIsAetraxaDesc')}
          </p>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="bg-black/80 backdrop-blur-md border border-white/5 rounded-[3rem] p-6 sm:p-10 flex flex-col gap-8 flex-grow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-500">
                <ShieldAlertIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">{t('howToUseTitle')}</h3>
            </div>
            
            <div className="flex flex-col gap-6">
              {[
                { step: '01', title: t('howToUseStep1Title'), desc: t('howToUseStep1Desc') },
                { step: '02', title: t('howToUseStep2Title'), desc: t('howToUseStep2Desc') },
                { step: '03', title: t('howToUseStep3Title'), desc: t('howToUseStep3Desc') }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6 group/item">
                  <span className="text-3xl font-black text-red-500/20 group-hover/item:text-red-500 transition-colors duration-500 leading-none">{item.step}</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-widest text-white">{item.title}</h4>
                    <p className="text-xs text-white/40 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 bg-black/80 backdrop-blur-md border border-white/5 rounded-[3.5rem] p-6 sm:p-10 md:p-14 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-white) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-2/3 space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
                  <ActivityIcon className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white">{t('howItWorksTitle')}</h3>
              </div>
              <p className="text-lg font-medium text-white/40 leading-relaxed">
                {t('howItWorksDesc')}
              </p>
            </div>
            
            <div className="md:w-1/3 w-full">
              <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] relative group hover:border-primary-accent/30 transition-all">
                <div className="absolute -top-4 -right-4 p-4 bg-primary-accent rounded-2xl shadow-2xl group-hover:scale-110 transition-transform">
                  <EarthIcon className="w-6 h-6 text-black" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white">{t('openMeteoTitle')}</h4>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{t('openMeteoSubtitle')}</p>
                  </div>
                  <p className="text-xs text-white/40 font-medium leading-relaxed">{t('openMeteoDesc')}</p>
                  <div className="pt-4 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
                    <span>Precision: ±0.1C</span>
                    <span>v4.2-SAT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-4 pt-12 border-t border-white/5">
        <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/20">AETRAXA Precise Thermal Analytics • Distributed Intelligence Matrix</p>
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-8 h-1 bg-white/5 rounded-full" />
          ))}
        </div>
      </div>
    </motion.div>
  );
});
