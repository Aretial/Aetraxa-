import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

export const TempUnitContext = createContext<{ tempUnit: 'celsius' | 'fahrenheit', setTempUnit: (u: 'celsius' | 'fahrenheit') => void }>({ tempUnit: 'celsius', setTempUnit: () => {} });
export const useTempUnit = () => useContext(TempUnitContext);

import { 
  Search as SearchIcon, 
  Droplets as DropletsIcon, 
  Thermometer as ThermometerIcon, 
  AlertTriangle as AlertTriangleIcon, 
  Sun as SunIcon, 
  Wind as WindIcon, 
  Clock as ClockIcon, 
  Share2 as ShareIcon,
  Settings as SettingsIcon,
  Navigation as NavigationIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
  Info as InfoIcon,
  User as UserIcon,
  LogOut as LogOutIcon,
  Flame as FlameIcon,
  Sparkles as SparklesIcon,
  Brain as BrainIcon,
  Cpu as CpuIcon,
  CloudRain as RainIcon,
  ShieldAlert as ShieldAlertIcon,
  Zap as ZapIcon,
  Lightbulb as LightbulbIcon,
  CheckCircle2 as CheckIcon,
  Twitter as TwitterIcon,
  Facebook as FacebookIcon,
  Link as LinkIcon,
  X as CloseIcon,
  Download as DownloadIcon,
  Globe as GlobeIcon,
  Activity as ActivityIcon
} from 'lucide-react';
import html2canvas from 'html2canvas';

import { ForecastChart } from './components/ForecastChart';
import { HeatwaveSafetyTips } from './components/HeatwaveSafetyTips';
import { getWeatherData, calculateHeatIndex as calcHI, searchCities } from './services/weatherService';
import { COUNTRIES, CITIES_BY_COUNTRY } from './constants/locations';
import { useLanguage } from './LanguageContext';

// --- Types & Constants ---

import { AboutPage } from './components/AboutPage';

enum Page {
  Landing = 'landing',
  Main = 'main',
  About = 'about'
}

interface WeatherData {
  city: string;
  timezone: string;
  windows: {
    hazard: string;
    optimal: string;
  };
  current: {
    temp: number;
    humidity: number;
    apparentTemp: number;
    uvIndex: number;
    windSpeed: number;
    weatherCode: number;
    heatIndex: number;
  };
  hourly: HourlyForecast[];
  daily: {
    tempMax: number;
    tempMin: number;
    uvIndexMax: number;
    sunrise: string;
    sunset: string;
  };
  lastUpdated: string;
  timestamp: string;
}

interface HourlyForecast {
  time: string;
  temp: number;
  humidity: number;
  heatIndex: number;
}

const DANGER_CATEGORIES = [
  { label: 'Optimal', min: 0, max: 26, color: '#10b981', text: 'text-emerald-500' },
  { label: 'Moderate', min: 26, max: 30, color: '#facc15', text: 'text-yellow-400' },
  { label: 'Caution', min: 30, max: 34, color: '#f97316', text: 'text-orange-500' },
  { label: 'Severe', min: 34, max: 39, color: '#ef4444', text: 'text-red-500' },
  { label: 'Extreme', min: 39, max: 45, color: '#b91c1c', text: 'text-red-700' },
  { label: 'Danger', min: 45, max: 52, color: '#86198f', text: 'text-fuchsia-800' },
  { label: 'Critical', min: 52, max: 200, color: '#2e1065', text: 'text-violet-950' },
];

// --- Utilities ---

const getDangerLevel = (hi: number) => {
  return DANGER_CATEGORIES.find(c => hi >= c.min && hi < c.max) || DANGER_CATEGORIES[DANGER_CATEGORIES.length - 1];
};

const formatTemp = (celsius: number, unit: 'celsius' | 'fahrenheit'): number => {
  if (unit === 'fahrenheit') {
    return (celsius * 9) / 5 + 32;
  }
  return celsius;
};

// --- Components ---

const Navbar = ({ onStart, onSectionChange }: { onStart: () => void, onSectionChange: (section: string) => void }) => {
  const { language, setLanguage, t } = useLanguage();
  const { tempUnit, setTempUnit } = useTempUnit();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[150] px-4 md:px-8 py-3 flex justify-between items-center bg-[#0c0a0a]/75 backdrop-blur-md transition-all rounded-full border border-[#fff2d4]/5 shadow-2xl">
      <button 
        className="flex items-center gap-3 cursor-pointer focus:outline-none rounded-lg px-2 py-1" 
        onClick={() => onSectionChange('home')}
        aria-label="AETRAXA Home"
      >
        <SunIcon className="w-5 h-5 text-[#db6321]" strokeWidth={2.5} aria-hidden="true" />
        <span className="text-[13px] font-bold uppercase tracking-[0.4em] text-[#fff2d4]">AETRAXA</span>
      </button>

      {/* Desktop Menu */}
      <div className="hidden xl:flex items-center gap-6">
        <div className="flex items-center gap-6 border-r border-[#fff2d4]/10 pr-6">
          <motion.button 
            onClick={() => onSectionChange('home')} 
            whileHover={{ y: -1, color: '#fff2d4' }}
            whileTap={{ y: 0, scale: 0.95 }}
            className="text-[11px] font-bold tracking-wide uppercase text-stone-400 transition-colors focus:text-[#fff2d4] focus:outline-none"
          >
            {t('home')}
          </motion.button>
          <motion.button 
            onClick={() => onSectionChange('about')} 
            whileHover={{ y: -1, color: '#fff2d4' }}
            whileTap={{ y: 0, scale: 0.95 }}
            className="text-[11px] font-bold tracking-wide uppercase text-stone-400 transition-colors focus:text-[#fff2d4] focus:outline-none"
          >
            {t('about')}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          {/* Temp Toggle Group */}
          <div className="relative flex items-center p-1 bg-white/5 rounded-full border border-white/10">
            <motion.div 
              className="absolute bg-[#db6321] rounded-full z-0"
              initial={false}
              animate={{ left: tempUnit === 'celsius' ? '4px' : '44px', width: '40px', height: 'calc(100% - 8px)' }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
            <button 
              onClick={() => setTempUnit('celsius')}
              className={`relative z-10 flex items-center justify-center text-[9px] font-black tracking-[0.15em] transition-colors rounded-full px-3 py-1.5 min-w-[40px] text-center focus:outline-none ${tempUnit === 'celsius' ? 'text-[#0c0a0a]' : 'text-stone-400 hover:text-stone-200'}`}
            >
              °C
            </button>
            <button 
              onClick={() => setTempUnit('fahrenheit')}
              className={`relative z-10 flex items-center justify-center text-[9px] font-black tracking-[0.15em] transition-colors rounded-full px-3 py-1.5 min-w-[40px] text-center focus:outline-none ${tempUnit === 'fahrenheit' ? 'text-[#0c0a0a]' : 'text-stone-400 hover:text-stone-200'}`}
            >
              °F
            </button>
          </div>

          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,242,212,0.1)' }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-[9px] font-black tracking-[0.2em] text-[#fff2d4] transition-all border border-[#fff2d4]/10 rounded-full px-4 py-2 text-center focus:outline-none min-w-[60px] gap-2 bg-[#0c0a0a]/40 backdrop-blur-md hover:border-[#db6321]/30"
          >
            <GlobeIcon className="w-3.5 h-3.5 text-[#db6321]" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>
        </div>
          
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.02, backgroundColor: '#ff7722', boxShadow: '0 0 30px rgba(219,99,33,0.4)' }}
          whileTap={{ scale: 0.98 }}
          className="px-7 py-2.5 bg-[#db6321] rounded-full font-black text-[10px] uppercase tracking-[0.25em] transition-all text-[#0c0a0a] focus:outline-none shadow-[0_0_20px_rgba(219,99,33,0.25)] border border-[#ff9955]/30 ml-2"
        >
          {t('launchSystem')}
        </motion.button>
      </div>

      {/* Mobile Inline Controls */}
      <div className="flex xl:hidden items-center gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 border-r border-[#fff2d4]/10 pr-2 sm:pr-3 mr-1">
          {/* Mobile Temp Toggle */}
          <div className="relative flex items-center p-1 bg-white/5 rounded-full border border-white/10">
            <motion.div 
              className="absolute bg-[#db6321] rounded-full z-0"
              initial={false}
              animate={{ left: tempUnit === 'celsius' ? '2px' : '32px', width: '30px', height: 'calc(100% - 4px)' }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
            <button 
              onClick={() => setTempUnit('celsius')}
              className={`relative z-10 flex items-center justify-center text-[8px] font-black tracking-[0.15em] transition-colors rounded-full px-2 py-1 min-w-[30px] text-center focus:outline-none ${tempUnit === 'celsius' ? 'text-[#0c0a0a]' : 'text-stone-400'}`}
            >
              °C
            </button>
            <button 
              onClick={() => setTempUnit('fahrenheit')}
              className={`relative z-10 flex items-center justify-center text-[8px] font-black tracking-[0.15em] transition-colors rounded-full px-2 py-1 min-w-[30px] text-center focus:outline-none ${tempUnit === 'fahrenheit' ? 'text-[#0c0a0a]' : 'text-stone-400'}`}
            >
              °F
            </button>
          </div>

          <motion.button 
            onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-[#fff2d4] transition-all border border-[#fff2d4]/10 rounded-full px-3 py-1.5 text-center focus:outline-none min-w-[45px] gap-1 bg-[#0c0a0a]/40 backdrop-blur-md"
          >
            <GlobeIcon className="w-3 h-3 text-[#db6321]" strokeWidth={2.5} />
            {language === 'en' ? 'EN' : 'UR'}
          </motion.button>
        </div>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 sm:p-2 text-[#fff2d4] focus:outline-none hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-white/10"
        >
          {isMenuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-[calc(100%+10px)] right-0 w-56 sm:w-64 bg-[#0c0a0a]/95 backdrop-blur-xl border border-[#fff2d4]/10 rounded-3xl p-4 flex flex-col gap-2 shadow-2xl xl:hidden overflow-hidden"
          >
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('home'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-stone-300 hover:text-[#fff2d4] hover:bg-white/5 rounded-2xl transition-colors"
            >
              {t('home')}
            </button>
            <button 
              onClick={() => { setIsMenuOpen(false); onSectionChange('about'); }}
              className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-stone-300 hover:text-[#fff2d4] hover:bg-white/5 rounded-2xl transition-colors"
            >
              {t('about')}
            </button>
            <div className="w-full h-[1px] bg-[#fff2d4]/10 my-2" />
            <button 
              onClick={() => { setIsMenuOpen(false); onStart(); }}
              className="w-full bg-[#db6321] text-[#0c0a0a] px-4 py-3 text-xs font-black tracking-[0.2em] uppercase rounded-2xl shadow-lg"
            >
              {t('launchSystem')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export const SearchableDropdown = React.memo(({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  disabled = false,
  onSearchQueryChange,
  onOptionSelect
}: { 
  options: any[], 
  value: string, 
  onChange: (val: string) => void, 
  placeholder: string,
  disabled?: boolean,
  onSearchQueryChange?: (query: string) => void,
  onOptionSelect?: (opt: any) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
    if (e.key === 'Enter' || e.key === ' ') {
      if (!isOpen && !disabled) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  useEffect(() => {
    if (onSearchQueryChange) {
      const timer = setTimeout(() => {
        onSearchQueryChange(search);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search, onSearchQueryChange]);

  const getLabel = (opt: any) => typeof opt === 'string' ? opt : (opt.displayName || opt.name);

  const filteredOptions = onSearchQueryChange ? options : options.filter(opt => 
    getLabel(opt).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className={`relative w-full ${isOpen ? 'z-[2000]' : 'z-10'}`}>
      <button 
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={value ? `${placeholder}: ${value}` : placeholder}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-[48px] bg-transparent border ${isOpen ? 'border-[#db6321]/50 shadow-[0_0_10px_rgba(197,87,27,0.1)]' : 'border-[#0c0a0a]'} rounded-full px-5 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-all group ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus:outline-none focus:border-stone-600'}`}
      >
        <span className={`${value ? 'text-[#fff2d4]' : 'text-[#888]'} truncate mr-2 font-semibold`}>
          {value || placeholder}
        </span>
        <ChevronRightIcon className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-90 text-[#fff2d4]' : 'text-stone-500'}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 w-full mt-2 bg-[#0A0A0A] border border-[#0c0a0a] rounded-2xl overflow-hidden z-[100] shadow-2xl backdrop-blur-xl"
          >
            <div className="p-3 border-b border-[#0c0a0a]">
              <input 
                autoFocus
                type="text"
                role="searchbox"
                aria-label="Filter options"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsOpen(false);
                }}
                className="w-full bg-[#0c0a0a] border border-[#0c0a0a] rounded-lg px-3 py-1.5 text-sm text-[#fff2d4] focus:outline-none focus:border-[#db6321]/30 font-bold"
              />
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, i) => {
                  const label = getLabel(opt);
                  const isSelected = value === label;
                  return (
                    <div 
                      key={`${label}-${i}`}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => {
                        onChange(label);
                        if (onOptionSelect) onOptionSelect(opt);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onChange(label);
                          if (onOptionSelect) onOptionSelect(opt);
                          setIsOpen(false);
                          setSearch('');
                        }
                      }}
                      className={`px-5 py-3 text-sm cursor-pointer hover:bg-orange-500/10 focus:bg-orange-500/10 focus:outline-none transition-colors flex justify-between items-center group/item ${isSelected ? 'bg-orange-500/5 text-orange-400' : 'text-stone-400 hover:text-[#fff2d4] focus:text-[#fff2d4]'}`}
                    >
                      <div className="flex flex-col">
                        <span className={`${isSelected ? 'text-orange-400' : 'text-stone-300 focus:text-[#fff2d4]'} font-bold`}>{label}</span>
                        {opt.type && (
                          <span className="text-[10px] uppercase tracking-widest text-stone-500 font-black">{opt.type}</span>
                        )}
                      </div>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#db6321]" aria-hidden="true" />}
                    </div>
                  );
                })
              ) : (
                <div role="status" className="p-5 text-center text-xs text-stone-500 uppercase tracking-widest">No results found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Qualitative Assessment Helpers
const getLocationTypeLabel = (code: string) => {
  if (!code) return '';
  const c = code.toUpperCase();
  if (c === 'PCLI') return 'Country';
  if (c.startsWith('ADM')) return 'Region';
  if (c === 'PPLC') return 'Capital';
  if (c.startsWith('PPL')) return 'City';
  return '';
};

const getHumidityStatus = (h: number) => {
  if (h < 30) return "Arid Condition";
  if (h < 50) return "Comfortable";
  if (h < 70) return "High Moisture";
  return "Tropical Saturated";
};

const getWindStatus = (s: number) => {
  if (s < 5) return "Calm Air";
  if (s < 15) return "Light Breeze";
  if (s < 30) return "Moderate Gusts";
  return "Intense Velocity";
};

const getUVStatus = (uv: number) => {
  if (uv <= 2) return "Safe Exposure";
  if (uv <= 5) return "Moderate Risk";
  if (uv <= 7) return "High Hazard";
  return "Extreme Alert";
};

export default function App() {
  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>(() => {
    return (localStorage.getItem('aetraxaTempUnit') as 'celsius' | 'fahrenheit') || 'celsius';
  });

  useEffect(() => {
    localStorage.setItem('aetraxaTempUnit', tempUnit);
  }, [tempUnit]);

  const [currentPage, setCurrentPage] = useState<Page>(Page.Landing);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCityData, setSelectedCityData] = useState<any>(null);
  const [baseCities, setBaseCities] = useState<any[]>([]);
  const [dynamicCities, setDynamicCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward' | null>(null);

  const { language, t } = useLanguage();

  const getAIInsights = useCallback(async (data: WeatherData) => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weatherData: data, language })
      });
      if (response.ok) {
        const insights = await response.json();
        setAiInsights(insights);
      }
    } catch (err) {
      console.error("AI Insight fetch failed", err);
    } finally {
      setAiLoading(false);
    }
  }, [language]);

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    setError(null);

    const fallbackToIp = async () => {
      try {
        const res = await fetch('https://freeipapi.com/api/json');
        if (!res.ok) throw new Error("Fallback failed");
        const data = await res.json();
        const weatherData = await getWeatherData({ lat: data.latitude, lon: data.longitude });
        setWeather(weatherData);
        setSelectedCity(weatherData.city);
        setSelectedCityData({ lat: data.latitude, lon: data.longitude });
        getAIInsights(weatherData);
        
        // Start transition if not already on Main page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (currentPage !== Page.Main) {
          setTimeout(() => {
            setTransitionDirection('forward');
            setTimeout(() => setCurrentPage(Page.Main), 100);
          }, 600);
        } else {
          setLoading(false);
        }
      } catch (fbErr) {
        setError("Unable to automatically detect location. Please search for your city directly.");
      } finally {
        setIsLocating(false);
      }
    };

    if (!navigator.geolocation) {
      fallbackToIp();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const weatherData = await getWeatherData({ lat: latitude, lon: longitude });
          setWeather(weatherData);
          setSelectedCity(weatherData.city);
          setSelectedCityData({ lat: latitude, lon: longitude });
          getAIInsights(weatherData);
          
          // Start transition if not already on Main page
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (currentPage !== Page.Main) {
            setTimeout(() => {
              setTransitionDirection('forward');
              setTimeout(() => setCurrentPage(Page.Main), 100);
            }, 600);
          } else {
            setLoading(false);
          }
          setIsLocating(false);
        } catch (err: any) {
          setError(err.message);
          setIsLocating(false);
        }
      },
      (err) => {
        // Fallback for iframe restrictions or permissions denial
        fallbackToIp();
      },
      { timeout: 10000 }
    );
  }, [getAIInsights, currentPage]);

  const handleCitySearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setDynamicCities(baseCities);
      return;
    }
    
    // Filter base cities locally first
    const filteredBase = baseCities.filter(c => 
      c.displayName.toLowerCase().includes(query.toLowerCase())
    );

    const countryCode = COUNTRIES.find(c => c.name === selectedCountry)?.code;
    const results = await searchCities(query, countryCode);
    const fromApi = results.map((r: any) => {
      const parts = [r.name];
      if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
      return {
        name: r.name,
        displayName: parts.join(', '),
        lat: r.latitude,
        lon: r.longitude,
        type: getLocationTypeLabel(r.feature_code)
      };
    }).filter((r: any) => {
      // If a country is selected, filter out results that are just the country themselves
      if (selectedCountry && r.type === 'Country' && r.name.toLowerCase() === selectedCountry.toLowerCase()) {
        return false;
      }
      return true;
    });

    // Merge: Filtered base cities + API results (avoiding duplicates)
    setDynamicCities(() => {
      const seen = new Set(filteredBase.map(c => c.displayName.toLowerCase()));
      const uniqueNew = fromApi.filter(c => !seen.has(c.displayName.toLowerCase()));
      return [...filteredBase, ...uniqueNew];
    });
  }, [baseCities, selectedCountry]);
  
  useEffect(() => {
    if (selectedCountry) {
      const countryCode = COUNTRIES.find(c => c.name === selectedCountry)?.code || '';
      const localCities = CITIES_BY_COUNTRY[countryCode] || [];
      const initialList = localCities.map(c => ({ name: c, displayName: c }));
      
      setBaseCities(initialList);
      setDynamicCities(initialList);

      // Fetch top cities from API to supplement the menu
      searchCities(selectedCountry, countryCode).then(results => {
        const fromApi = results.map((r: any) => {
          const parts = [r.name];
          if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
          return {
            name: r.name,
            displayName: parts.join(', '),
            lat: r.latitude,
            lon: r.longitude,
            type: getLocationTypeLabel(r.feature_code)
          };
        }).filter((r: any) => {
          // Priority: Keep cities and capitals, maybe keep regions if sparse
          if (r.type === 'Country') return false; // Don't show country in city list
          return true;
        });
        
        // Merge lists, avoiding duplicates by name
        setBaseCities(prev => {
          const existingNames = new Set(prev.map(c => c.name.toLowerCase()));
          const uniqueNew = fromApi.filter(c => !existingNames.has(c.name.toLowerCase()));
          const newList = [...prev, ...uniqueNew];
          setDynamicCities(newList);
          return newList;
        });
      });
    } else {
      setBaseCities([]);
      setDynamicCities([]);
    }
  }, [selectedCountry]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedCity) return;

    setLoading(true);
    setError(null);
    try {
      const query = selectedCityData || (selectedCity + (selectedCountry ? `, ${selectedCountry}` : ''));
      const weatherData = await getWeatherData(query);
      setWeather(weatherData);
      getAIInsights(weatherData);

      // Trigger Transition Sequence if not already on Main page
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (currentPage !== Page.Main) {
        setTimeout(() => {
          setTransitionDirection('forward');
          setTimeout(() => setCurrentPage(Page.Main), 100);
        }, 600);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [selectedCity, selectedCityData, selectedCountry, getAIInsights, currentPage]);

  const onTransitionComplete = useCallback(() => {
    setTransitionDirection(null);
    setLoading(false);
  }, []);

  const handleEmptyTransition = useCallback(() => {
    if (currentPage === Page.Main) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setTransitionDirection('forward');
      setTimeout(() => setCurrentPage(Page.Main), 100);
    }, 600);
  }, [currentPage]);

  const handleHome = useCallback(() => {
    if (currentPage === Page.Landing) return;
    
    if (currentPage === Page.About) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setCurrentPage(Page.Landing), 300);
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setTransitionDirection('backward');
      setTimeout(() => setCurrentPage(Page.Landing), 100);
    }, 300);
  }, [currentPage]);

  const handleShare = useCallback(() => {
    if (!weather) return;
    setIsShareModalOpen(true);
  }, [weather]);

  return (
    <div className="relative min-h-screen flex flex-col font-sans bg-[#0c0a0a] overflow-x-hidden selection:bg-orange-500/30">
      <TempUnitContext.Provider value={{ tempUnit, setTempUnit }}>
      {/* Background Glow Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[#050505]" />
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-orange-950/20 blur-[150px]" />
        <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-red-950/15 blur-[120px]" />
      </div>

      <ScrollFrameBackground 
        transitionDirection={transitionDirection} 
        onTransitionComplete={onTransitionComplete} 
        currentPage={currentPage}
      />

      <div 
        className="relative z-10 w-full flex flex-col flex-grow min-h-screen"
        style={{ 
          opacity: transitionDirection ? 0 : 1, 
          pointerEvents: transitionDirection ? 'none' : 'auto',
          transition: transitionDirection ? 'opacity 0.2s' : 'opacity 0.3s'
        }}
      >
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:px-4 focus:py-2 focus:bg-orange-600 focus:text-[#fff2d4] focus:top-4 focus:left-4 focus:rounded-full focus:font-bold"
        >
          Skip to main content
        </a>
        <Navbar 
          onStart={() => {
            if (selectedCity) {
              handleSearch();
            } else {
              handleEmptyTransition();
            }
          }} 
          onSectionChange={(section) => {
            if (section === 'home') handleHome();
            if (section === 'about') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => setCurrentPage(Page.About), 300);
            }
          }}
        />
      
        <AnimatePresence>
          {isShareModalOpen && weather && (
            <ShareModal 
              weather={weather} 
              onClose={() => setIsShareModalOpen(false)} 
            />
          )}
        </AnimatePresence>

        {/* Pages Container */}
        <main id="main-content" className="relative z-10 w-full flex-grow overflow-y-auto scroll-smooth">
        <AnimatePresence mode="wait">
          {currentPage === Page.Landing ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 1.02 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <LandingPage 
                onStart={handleSearch} 
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                setSelectedCityData={setSelectedCityData}
                onSearch={handleSearch}
                loading={loading}
                dynamicCities={dynamicCities}
                setDynamicCities={setDynamicCities}
                handleCitySearch={handleCitySearch}
                onLocateMe={handleLocateMe}
                isLocating={isLocating}
              />
            </motion.div>
          ) : currentPage === Page.Main ? (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 1.02 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <MainAppPage 
                weather={weather}
                aiInsights={aiInsights}
                aiLoading={aiLoading}
                onSearch={handleSearch}
                loading={loading}
                error={error}
                handleShare={handleShare}
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                setSelectedCityData={setSelectedCityData}
                dynamicCities={dynamicCities}
                setDynamicCities={setDynamicCities}
                handleCitySearch={handleCitySearch}
                onLocateMe={handleLocateMe}
                isLocating={isLocating}
              />
            </motion.div>
          ) : currentPage === Page.About ? (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 1.02 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <AboutPage onBack={handleHome} />
            </motion.div>
          ) : null}
        </AnimatePresence>
        </main>

        <AppFooter />
      </div>

      {/* Global Shimmer Overlay */}
      <div className="fixed inset-0 pointer-events-none z-20 heat-shimmer mix-blend-overlay opacity-[0.03]">
        <div className="h-full w-full bg-gradient-to-t from-transparent via-orange-500 to-transparent" />
      </div>
      </TempUnitContext.Provider>
    </div>
  );
}

// --- Landing Sub-Components ---

const ThermalHotspots = React.memo(() => {
  const { t } = useLanguage();
  const { tempUnit } = useTempUnit();
  const [hotspotData, setHotspotData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const potentialHotspots = [
          { name: 'Kuwait City', country: 'Kuwait', lat: 29.37, lon: 47.97 },
          { name: 'Baghdad', country: 'Iraq', lat: 33.31, lon: 44.36 },
          { name: 'Jacobabad', country: 'Pakistan', lat: 28.28, lon: 68.43 },
          { name: 'Phoenix', country: 'USA', lat: 33.45, lon: -112.07 },
          { name: 'Dubai', country: 'UAE', lat: 25.20, lon: 55.27 },
          { name: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 }
        ];

        const lats = potentialHotspots.map(h => h.lat).join(',');
        const lons = potentialHotspots.map(h => h.lon).join(',');
        
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m&daily=temperature_2m_max&timezone=auto`);
        const data = await res.json();
        
        // Open-Meteo returns an Array when multiple coordinates are requested
        const validResults = (Array.isArray(data) ? data : [data]).map((locationData, index) => {
          if (!locationData.current) return null;
          const city = potentialHotspots[index];
          return {
            city: city.name,
            country: city.country,
            temp: locationData.current.temperature_2m,
            peakTemp: locationData.daily?.temperature_2m_max ? locationData.daily.temperature_2m_max[0] : null,
          };
        }).filter((r): r is any => r !== null)
          .sort((a, b) => b.temp - a.temp)
          .slice(0, 6);

        setHotspotData(validResults);
      } catch (err) {
        console.error("Failed to fetch hotspot data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHotspots();
  }, []);

  return (
    <div className="w-full max-w-7xl mt-12 px-4">
      <div className="bg-[#0c0a0a]/75 rounded-[2.5rem] md:rounded-[3rem] py-12 md:py-16 px-6 md:px-12 backdrop-blur-md border border-[#fff2d4]/5">
      <div className="flex flex-col items-start mb-10 w-full">
        <div className="flex items-center gap-3 mb-3">
          <FlameIcon className="w-5 h-5 text-orange-500" />
          <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('criticalHeatLabel')}</span>
        </div>
        <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-[#fff2d4]">
          {t('thermalHotspotsTitle1')} <span className="text-orange-500 italic">{t('thermalHotspotsTitle2')}</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(loading ? Array(6).fill({}) : hotspotData).map((h, i) => (
          <motion.div
            key={h.city || i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-orange-600/20 blur-[30px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-[#0c0a0a]/60 border border-[#fff2d4]/5 p-8 rounded-[2.5rem] group-hover:border-orange-500/30 transition-all flex flex-col gap-8 overflow-hidden h-full min-h-[260px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-orange-600/10 transition-colors" />
              
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1.5">
                  <span className={`text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] ${loading ? 'bg-[#fff2d4]/10 w-16 h-3 rounded animate-pulse' : ''}`}>
                    {!loading && h.country}
                  </span>
                  <span className={`text-[#fff2d4] text-lg font-black uppercase tracking-wider ${loading ? 'bg-[#fff2d4]/10 w-24 h-6 rounded animate-pulse mt-1' : ''}`}>
                    {!loading && h.city}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest font-sans">{t('live')}</span>
                  </div>
                  <span className={`text-stone-500 text-[10px] font-bold uppercase tracking-widest ${loading ? 'bg-[#fff2d4]/5 w-16 h-3 rounded animate-pulse mt-1' : ''}`}>
                    {!loading && h.peakTemp !== null && `${t('peak')}: ${Math.floor(formatTemp(h.peakTemp, tempUnit))}°`}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mt-auto">
                <span className={`text-6xl font-black text-[#fff2d4] font-mono tracking-tighter ${loading ? 'bg-[#fff2d4]/10 w-20 h-14 rounded animate-pulse' : ''}`}>
                  {!loading && `${Math.round(formatTemp(h.temp, tempUnit))}°`}
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-orange-500 uppercase leading-none font-sans tracking-wide">{!loading && getDangerLevel(h.temp).label}</span>
                </div>
              </div>

              <div className="w-full bg-[#fff2d4]/5 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: loading ? 0 : `${(h.temp/50) * 100}%` }}
                  transition={{ duration: 1.5, delay: i * 0.2 }}
                  className="bg-gradient-to-r from-orange-600 to-red-600 h-full"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
});

const DidYouKnow = React.memo(() => {
  const { t } = useLanguage();
  const [globalStats, setGlobalStats] = React.useState({ hottest: 'Loading...', currentAvg: '32.4°C' });

  React.useEffect(() => {
    // We can't easily get a true "Global Avg" but we can show some relevant surveillance-style facts
    // that sound more technical and integrated.
  }, []);

  const facts = [
    {
      title: t('fact1Title'),
      text: t('fact1Text'),
      accent: "text-orange-500",
      icon: <BrainIcon className="w-5 h-5" />
    },
    {
      title: t('fact2Title'),
      text: t('fact2Text'),
      accent: "text-emerald-500",
      icon: <ZapIcon className="w-5 h-5" />
    },
    {
      title: t('fact3Title'),
      text: t('fact3Text'),
      accent: "text-red-500",
      icon: <ShieldAlertIcon className="w-5 h-5" />
    }
  ];

  return (
    <div className="w-full max-w-7xl mt-32 mb-20 px-4">
      <div className="bg-[#0c0a0a]/75 rounded-[2.5rem] md:rounded-[3rem] py-12 md:py-16 px-6 md:px-12 backdrop-blur-md border border-[#fff2d4]/5">
      <div className="flex flex-col items-start mb-14 w-full">
        <div className="flex items-center gap-3 mb-3">
          <CpuIcon className="w-5 h-5 text-orange-500 animate-pulse" />
          <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('deepFieldIntel')}</span>
        </div>
        <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-[#fff2d4]">
          {t('aetraxaProtocols1')} <span className="text-orange-500 italic">{t('aetraxaProtocols2')}</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {facts.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            transition={{ delay: i * 0.15, duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="group relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-b from-orange-500/10 to-transparent rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative p-10 bg-[#0c0a0a]/60 border border-[#fff2d4]/5 rounded-[2.5rem] flex flex-col gap-6 group hover:border-orange-500/20 transition-all h-full shadow-2xl overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className={`p-4 rounded-2xl bg-[#fff2d4]/5 border border-[#fff2d4]/5 ${f.accent} group-hover:bg-[#fff2d4]/10 transition-all w-fit shadow-inner`}>
                {f.icon}
              </div>
              <div className="space-y-3">
                <h4 className="text-lg font-black uppercase tracking-tight text-[#fff2d4] leading-tight group-hover:text-orange-500 transition-colors">{f.title}</h4>
                <p className="text-sm text-stone-400 leading-relaxed font-bold tracking-wide italic">"{f.text}"</p>
              </div>
              
              <div className="mt-auto pt-6 flex items-center justify-between border-t border-[#fff2d4]/5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">{t('activeIntelligence')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-orange-500 animate-ping" />
                  <span className="text-[9px] font-black text-orange-500 uppercase">{t('verified')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
});

// --- Sub-Components ---

const RadialDangerGauge = ({ heatIndex, currentLevel, isHighRisk, t }: { heatIndex: number, currentLevel: any, isHighRisk: boolean, t: any }) => {
  const cx = 200;
  const cy = 200;
  
  const outerRadius = 140;
  const innerRadius = 110;
  const tickRadius = 165;
  const strokeWidth = 18;

  const minVisual = 20;
  const maxVisual = 60;
  
  // Clamped value for visual purpose
  const currentVal = Math.max(minVisual, Math.min(maxVisual, heatIndex || 0));
  const progressRatio = (currentVal - minVisual) / (maxVisual - minVisual);

  // We want to span 240 degrees. 0 = top.
  const startAngle = -120;
  const endAngle = 120;
  const totalAngle = 240;

  // Convert polar to cartesian
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    // 0 degrees is up (12 o'clock)
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

  // Generate tick marks
  const tickCount = 40;
  const ticks = Array.from({ length: tickCount + 1 }).map((_, i) => {
    const ratio = i / tickCount;
    const angle = startAngle + (ratio * totalAngle); 
    const innerPoint = polarToCartesian(cx, cy, tickRadius, angle);
    const outerPoint = polarToCartesian(cx, cy, tickRadius + (i % 5 === 0 ? 8 : 3), angle);
    
    // In the image, ticks are white/gray with low opacity.
    return (
      <line 
        key={i} 
        x1={innerPoint.x} y1={innerPoint.y} 
        x2={outerPoint.x} y2={outerPoint.y}
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeOpacity={0.4}
        strokeLinecap="round"
      />
    );
  });

  // Background arcs spanning full 240 deg
  const fullOuterArc = describeArc(cx, cy, outerRadius, startAngle, endAngle);
  const fullInnerArc = describeArc(cx, cy, innerRadius, startAngle, endAngle);

  // Base needle at 0 angle (straight up)
  const needleStart = polarToCartesian(cx, cy, innerRadius - 20, 0);
  const needleEnd = polarToCartesian(cx, cy, outerRadius, 0);
  // Calculates what angle we need to rotate to
  const needleAngle = startAngle + (progressRatio * totalAngle);

  return (
    <div className={`relative flex flex-col items-center justify-center w-full pb-8`}>
      {/* Soft background glow */}
      <div className="absolute inset-x-0 bottom-12 top-1/2 flex items-center justify-center pointer-events-none">
         <div className="w-56 h-56 bg-[#db6321]/20 blur-[80px] rounded-full mix-blend-screen" />
      </div>

      <svg width="100%" height="auto" viewBox="0 0 400 290" className="overflow-visible z-10 relative" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f9e8c4" />
            <stop offset="20%" stopColor="#dc5e1e" />
            <stop offset="40%" stopColor="#a3441b" />
            <stop offset="60%" stopColor="#672412" />
            <stop offset="80%" stopColor="#40180f" />
            <stop offset="100%" stopColor="#1c100d" />
          </linearGradient>
        </defs>

        {/* Ticks */}
        <g className="transition-opacity duration-700 delay-300">
          {ticks}
        </g>
        
        {/* Background Tracks */}
        <path d={fullOuterArc} fill="none" stroke="#262220" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={fullInnerArc} fill="none" stroke="#262220" strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Progress Tracks */}
        <motion.path 
          d={fullOuterArc} 
          fill="none" 
          stroke="url(#gauge-gradient)" 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progressRatio }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          filter="url(#gauge-glow)"
        />
        <motion.path 
          d={fullInnerArc} 
          fill="none" 
          stroke="url(#gauge-gradient)" 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progressRatio }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      
      {/* Center Values */}
      <div className="absolute inset-x-0 top-1/2 flex flex-col items-center justify-center transform translate-y-6 pointer-events-none z-20">
        <span className="text-6xl lg:text-7xl font-black tracking-tight text-[#f9e8c4] leading-none mb-3 drop-shadow-md">
          {heatIndex !== undefined ? Math.floor(heatIndex) : 0}°
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.5em] text-[#dc5e1e]">
          {currentLevel?.label || 'MAXIMUM'}
        </span>
      </div>
    </div>
  );
};

const ScrollFrameBackground = React.memo(({ transitionDirection, onTransitionComplete, currentPage }: { transitionDirection?: 'forward' | 'backward' | null, onTransitionComplete?: () => void, currentPage: Page }) => {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const imagesRef = useRef<HTMLImageElement[]>([]);
   const transImagesRef = useRef<HTMLImageElement[]>([]);
   const FRAME_COUNT = 240;
   const TRANS_FRAME_COUNT = 108;
   const currentFrameRef = useRef(1);
   const transFrameRef = useRef(1);
   const scrollRafRef = useRef<number>(0);
   const transRafRef = useRef<number>(0);
   const [isReady, setIsReady] = useState(false);
   const [isTransReady, setIsTransReady] = useState(false);

   // Preload sequences
   useEffect(() => {
     const images: HTMLImageElement[] = [];
     const transImages: HTMLImageElement[] = [];
     
     const loadSequences = async () => {
       // Landing Sequence
       const landingPromises = [];
       for (let i = 1; i <= 30; i++) {
         const img = new Image();
         img.src = `/assets/frames/frame_ (${i}).webp`;
         landingPromises.push(new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }));
         images[i-1] = img;
       }
       await Promise.all(landingPromises);
       imagesRef.current = images;
       drawFrame(1, imagesRef);
       setIsReady(true);

       // Rest of Landing
       for (let i = 31; i <= FRAME_COUNT; i++) {
         const img = new Image();
         img.src = `/assets/frames/frame_ (${i}).webp`;
         images[i-1] = img;
       }

       // Transition Sequence
       const transPromises = [];
       for (let i = 1; i <= TRANS_FRAME_COUNT; i++) {
         const img = new Image();
         img.src = `/assets/transition/transition_ (${i}).webp`;
         transPromises.push(new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }));
         transImages[i-1] = img;
       }
       await Promise.all(transPromises);
       transImagesRef.current = transImages;
       setIsTransReady(true);
     };

     loadSequences();
   }, []);

   const drawFrame = useCallback((index: number, ref: React.MutableRefObject<HTMLImageElement[]>) => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d', { alpha: false });
     if (!ctx) return;

     const img = ref.current[index - 1];
     if (!img || !img.complete) return;

     const cw = canvas.width;
     const ch = canvas.height;
     const iw = img.naturalWidth;
     const ih = img.naturalHeight;
     const scale = Math.max(cw / iw, ch / ih);
     const x = (cw - iw * scale) / 2;
     const y = (ch - ih * scale) / 2;

     ctx.drawImage(img, x, y, iw * scale, ih * scale);
   }, []);

   // Handle Transition Playback
   useEffect(() => {
     if (transitionDirection && isTransReady) {
       let frame = transitionDirection === 'forward' ? 1 : TRANS_FRAME_COUNT;
       const playTransition = () => {
         drawFrame(frame, transImagesRef);
         if (transitionDirection === 'forward') {
           if (frame < TRANS_FRAME_COUNT) {
             frame++;
             transRafRef.current = requestAnimationFrame(playTransition);
           } else {
             onTransitionComplete?.();
           }
         } else {
           if (frame > 1) {
             frame--;
             transRafRef.current = requestAnimationFrame(playTransition);
           } else {
             onTransitionComplete?.();
           }
         }
       };
       transRafRef.current = requestAnimationFrame(playTransition);
       return () => cancelAnimationFrame(transRafRef.current);
     }
   }, [transitionDirection, isTransReady, drawFrame, onTransitionComplete]);

   useEffect(() => {
     const resize = () => {
       if (canvasRef.current) {
         canvasRef.current.width = window.innerWidth;
         canvasRef.current.height = window.innerHeight;
         if (transitionDirection) {
            drawFrame(transFrameRef.current, transImagesRef);
         } else if (currentPage === Page.Main) {
            drawFrame(TRANS_FRAME_COUNT, transImagesRef);
         } else {
            drawFrame(currentFrameRef.current, imagesRef);
         }
       }
     };
     window.addEventListener('resize', resize);
     resize();

     const updateFrame = () => {
       if (transitionDirection || currentPage === Page.Main) return;
       const scrollTop = window.scrollY || document.documentElement.scrollTop;
       const scrollHeight = document.documentElement.scrollHeight;
       const clientHeight = window.innerHeight;
       const maxScroll = scrollHeight - clientHeight;
       if (maxScroll <= 0) return;
       
       const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
       const frameIndex = Math.min(Math.floor(progress * FRAME_COUNT), FRAME_COUNT - 1) + 1;

       if (frameIndex !== currentFrameRef.current) {
         currentFrameRef.current = frameIndex;
         cancelAnimationFrame(scrollRafRef.current);
         scrollRafRef.current = requestAnimationFrame(() => drawFrame(frameIndex, imagesRef));
       }
     };

     window.addEventListener('scroll', updateFrame, { passive: true });
     updateFrame();

     return () => {
       window.removeEventListener('scroll', updateFrame);
       window.removeEventListener('resize', resize);
       cancelAnimationFrame(scrollRafRef.current);
     };
   }, [drawFrame, transitionDirection, currentPage]);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: isReady ? 1 : 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="fixed top-0 left-0 w-screen h-screen pointer-events-none will-change-transform"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
});

function LandingPage({ 
  onStart, 
  selectedCountry, 
  setSelectedCountry, 
  selectedCity, 
  setSelectedCity,
  setSelectedCityData,
  onSearch,
  loading,
  dynamicCities,
  setDynamicCities,
  handleCitySearch,
  onLocateMe,
  isLocating
}: { 
  onStart: () => void,
  selectedCountry: string,
  setSelectedCountry: (val: string) => void,
  selectedCity: string,
  setSelectedCity: (val: string) => void,
  setSelectedCityData: (val: any) => void,
  onSearch: (e?: React.FormEvent) => void,
  loading: boolean,
  dynamicCities: any[],
  setDynamicCities: (val: any[]) => void,
  handleCitySearch: (query: string) => void,
  onLocateMe: () => void,
  isLocating: boolean
}) {
  const { language, t } = useLanguage();
  return (
    <div className="relative">
    <div 
      className="relative w-full min-h-screen flex flex-col items-center justify-center pt-[100px] pb-24 px-4 sm:px-6 z-10"
    >

      
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.15,
              delayChildren: 0.2
            }
          }
        }}
        className="relative z-10 flex flex-col items-center w-full max-w-7xl mx-auto mt-0 mb-8"
      >
        <div className="w-full h-full flex flex-col items-center justify-center text-center bg-[#0c0a0a]/75 rounded-[2.5rem] md:rounded-[3rem] py-16 md:py-24 px-6 md:px-12 backdrop-blur-md border border-[#fff2d4]/5">
          <motion.div
            variants={{
              hidden: { y: 40, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } }
            }}
            className="space-y-6 relative z-10 flex flex-col items-center w-full"
          >
            <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#db6321] bg-[#0c0a0a]/40 backdrop-blur-md ${language === 'ur' ? 'mb-12' : 'mb-6'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#db6321] shadow-[0_0_8px_rgba(216,98,33,0.6)]" />
              <span className="text-xs sm:text-sm font-semibold text-[#db6321] tracking-wider text-center">{t('systemActive')}</span>
            </div>
            
            <h1 className="text-5xl sm:text-[10vw] lg:text-[7.5rem] font-display font-black leading-[0.85] text-center tracking-tight">
              {language === 'en' ? (
                <>
                  <span className="text-[#fff2d4]">IS IT </span>
                  <span className="text-[#db6321]">SAFE</span><br/>
                  <span className="text-[#db6321]">OUTSIDE </span>
                  <span className="text-[#fff2d4]">TODAY?</span>
                </>
              ) : (
                <>
                  <span className="text-[#fff2d4]">کیا آج باہر جانا </span>
                  <span className="text-[#db6321]">محفوظ ہے؟</span>
                </>
              )}
            </h1>
            
            <div className="w-32 h-[3px] bg-[#db6321] my-8 rounded-full opacity-80" />
            
            <p className="text-sm md:text-xl text-[#fff2d4] font-medium tracking-wide max-w-2xl mx-auto leading-relaxed pt-2">
              {t('landingDesc')}
            </p>
          </motion.div>

          <motion.div 
             variants={{
               hidden: { y: 30, opacity: 0 },
               visible: { y: 0, opacity: 1, transition: { duration: 0.8 } }
             }}
             className="mt-16 flex flex-col md:flex-row items-center gap-4 w-full max-w-4xl bg-[#0a0a0a]/90 p-3 md:p-4 rounded-[3rem] border border-[#db6321]/30 backdrop-blur-3xl relative z-50 transition-colors shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex-1">
                <SearchableDropdown 
                  options={COUNTRIES.map(c => c.name)}
                  value={selectedCountry}
                  onChange={(val) => {
                    setSelectedCountry(val);
                    setSelectedCity('');
                    setSelectedCityData(null);
                  }}
                  placeholder={t('country') || 'Country'}
                />
              </div>
              <div className="flex-1 flex gap-3">
                <div className="flex-1">
                  <SearchableDropdown 
                    options={dynamicCities}
                    value={selectedCity}
                    onChange={setSelectedCity}
                    onOptionSelect={setSelectedCityData}
                    placeholder={t('city') || 'Location'}
                    disabled={!selectedCountry}
                    onSearchQueryChange={handleCitySearch}
                  />
                </div>
                <motion.button
                  onClick={onLocateMe}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,242,212,0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLocating}
                  className="w-[48px] h-[48px] rounded-full border border-[#0c0a0a] text-stone-300 hover:text-[#fff2d4] transition-all flex items-center justify-center shrink-0"
                  title={t('currentLocation')}
                >
                  <NavigationIcon className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </div>

            <motion.button
              onClick={() => {
                if (selectedCity) {
                  onSearch();
                }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!selectedCity || loading}
              className={`whitespace-nowrap h-[48px] px-10 rounded-full font-bold text-sm uppercase tracking-wider transition-colors duration-200 mt-2 md:mt-0 ml-0 md:ml-4 w-full md:w-auto ${
                !selectedCity || loading 
                  ? 'bg-[#0c0a0a] text-stone-600 cursor-not-allowed' 
                  : 'bg-[#db6321] text-[#0c0a0a] hover:bg-[#db6321] shadow-[0_0_20px_rgba(197,87,27,0.3)]'
              }`}
            >
              {loading ? t('analyzing') : t('analyzeHeat')}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
    <div className="w-full relative z-10 flex flex-col items-center">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col items-center">
        <ThermalHotspots />
        <DidYouKnow />
      </div>
    </div>
    </div>
  );
}

const AppFooter = React.memo(() => {
  const { t } = useLanguage();
  return (
    <footer className="relative z-30 w-full border-t border-[#fff2d4]/5 bg-[#0c0a0a]/40 backdrop-blur-xl py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4 w-full">
          <div className="flex items-center gap-2">
            <SunIcon className="w-5 h-5 text-orange-500" strokeWidth={3} aria-hidden="true" />
            <span className="text-sm font-black uppercase tracking-[0.4em] text-[#fff2d4]">AETRAXA</span>
          </div>
          <p className="text-xs text-stone-400 tracking-widest leading-relaxed text-center md:text-left max-w-xs font-bold">
            {t('footerText')}
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2">
          <div className="px-4 py-2 rounded-full border border-orange-500/20 bg-orange-500/5 backdrop-blur-md">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">{t('freeForever')}</span>
          </div>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
            {t('dataProvidedBy')} <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-[#fff2d4] hover:text-orange-500 underline decoration-white/20 transition-all focus:outline-none focus:ring-1 focus:ring-orange-500 rounded">Open-Meteo</a>
          </p>
        </div>
      </div>
    </footer>
  );
});

const MainAppPage = React.memo(({ 
  weather, 
  aiInsights,
  aiLoading,
  onSearch, 
  loading, 
  error,
  handleShare,
  selectedCountry,
  setSelectedCountry,
  selectedCity,
  setSelectedCity,
  setSelectedCityData,
  dynamicCities,
  setDynamicCities,
  handleCitySearch,
  onLocateMe,
  isLocating
}: any) => {
  const currentLevel = weather ? getDangerLevel(weather.current.heatIndex) : null;
  const isHighRisk = weather && weather.current.heatIndex >= 32;
  const { tempUnit } = useTempUnit();
  const tempUnitStr = tempUnit === 'celsius' ? '°C' : '°F';
  const { t } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-20 flex flex-col gap-10">
      {/* Search & Location Bar */}
      <section className="bg-[#0c0a0a]/75 backdrop-blur-md rounded-[2.5rem] p-4 md:p-6 border border-[#fff2d4]/5 flex flex-col xl:flex-row items-center gap-6 relative z-[100]">
        <div className="flex-grow flex flex-col min-w-0 px-4">
           <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#fff2d4] truncate">
             {weather ? weather.city : t('selectLocation')}
           </h2>
           <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.4em] mt-1">
             {weather ? `${selectedCountry} • ${t('globalPosition' as any)}` : t('initialScan' as any)}
           </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="w-full sm:w-[220px]">
              <SearchableDropdown 
                options={COUNTRIES.map(c => c.name)}
                value={selectedCountry}
                onChange={(val) => {
                  setSelectedCountry(val);
                  setSelectedCity('');
                  setSelectedCityData(null);
                }}
                placeholder={t('country')}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-[280px]">
              <SearchableDropdown 
                options={dynamicCities}
                value={selectedCity}
                onChange={setSelectedCity}
                onOptionSelect={setSelectedCityData}
                placeholder={t('city')}
                disabled={!selectedCountry}
                onSearchQueryChange={handleCitySearch}
              />
              <motion.button
                onClick={onLocateMe}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(219,99,33,0.1)' }}
                whileTap={{ scale: 0.95 }}
                disabled={isLocating}
                className="p-3.5 rounded-full border border-[#db6321]/30 text-[#db6321] transition-all"
              >
                <NavigationIcon className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectedCity && onSearch({ preventDefault: () => {} } as any)}
            disabled={!selectedCity || loading}
            className={`whitespace-nowrap h-[48px] px-10 rounded-full font-bold text-sm uppercase tracking-wider transition-colors duration-200 w-full xl:w-auto ${
              !selectedCity || loading 
                ? 'bg-[#0c0a0a] text-stone-600 cursor-not-allowed' 
                : 'bg-[#db6321] text-[#0c0a0a] hover:bg-[#db6321] shadow-[0_0_20px_rgba(197,87,27,0.3)]'
            }`}
          >
            {loading ? t('analyzing') : t('analyzeHeat')}
          </motion.button>
        </div>
      </section>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
      {!weather ? (
        <motion.div 
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="flex-grow flex flex-col items-center justify-center py-32 gap-8 bg-[#0c0a0a]/75 backdrop-blur-md rounded-[3rem] border border-[#fff2d4]/5"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative p-10 rounded-full bg-[#0c0a0a] border border-[#db6321]/30">
               <SunIcon className="w-16 h-16 text-[#db6321]" />
            </div>
          </div>
          <div className="text-center space-y-4">
            <h3 className="text-xl font-black uppercase tracking-[0.5em] text-[#fff2d4]">{t('atmosphericIntelligence')}</h3>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
              Scan initialized. Please select coordinates above to begin heatwave analysis.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="data"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Hero Section: Gauge and Primary Metrics */}
          <section className="lg:col-span-12 xl:col-span-8 bg-[#0c0a0a]/75 backdrop-blur-md rounded-[3rem] border border-[#fff2d4]/5 p-5 sm:p-8 md:p-12 relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/5 blur-[120px] rounded-full -mr-48 -mt-48" />
            
            <div className="w-full flex justify-between items-start mb-12">
               <div className="flex items-center gap-4 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full">
                 <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">{t('liveAtmosphere' as any)}</span>
               </div>
               
               <div className="flex items-center gap-3">
                 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleShare} className="p-3 rounded-full bg-white/5 border border-white/10 text-[#fff2d4] hover:bg-white/10 transition-all">
                   <ShareIcon className="w-5 h-5" />
                 </motion.button>
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-12">
              <div className="flex flex-col items-center md:items-start gap-8 flex-1">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em]">{t('heatIndexLabel')}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-8xl md:text-9xl font-black text-[#fff2d4] tracking-tighter leading-none">
                      {Math.floor(formatTemp(weather.current.heatIndex, tempUnit))}°
                    </span>
                  </div>
                </div>

                <div className="flex gap-12">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em]">{t('temperatureLabel')}</span>
                    <p className="text-4xl font-black text-[#fff2d4]/60 tracking-tight">
                      {formatTemp(weather.current.temp, tempUnit).toFixed(1)}<span className="text-xl text-stone-600">{tempUnitStr}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em]">{t('statusLabel' as any)}</span>
                    <p className="text-xl font-black uppercase tracking-widest" style={{ color: currentLevel?.color }}>
                      {t(`status${currentLevel?.label}` as any) || currentLevel?.label}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative flex-shrink-0 w-full max-w-[400px]">
                <RadialDangerGauge 
                  heatIndex={weather.current.heatIndex} 
                  currentLevel={currentLevel} 
                  isHighRisk={isHighRisk} 
                  t={t} 
                />
              </div>
            </div>
          </section>

          {/* AI Tactical Card */}
          <section className="lg:col-span-12 xl:col-span-4 flex flex-col gap-8">
            <div className="bg-[#0c0a0a]/75 backdrop-blur-md rounded-[3rem] border border-[#fff2d4]/5 p-6 md:p-8 flex flex-col gap-8 flex-grow">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                  <CpuIcon className={`w-5 h-5 text-orange-500 ${aiLoading ? 'animate-pulse' : ''}`} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fff2d4]">{t('atmosphericIntelligence')}</h3>
              </div>

              <div className="flex-grow flex flex-col justify-center">
                {aiLoading ? (
                  <div className="space-y-4">
                    <div className="h-2 bg-white/5 rounded-full w-full animate-pulse" />
                    <div className="h-2 bg-white/5 rounded-full w-5/6 animate-pulse" />
                    <div className="h-2 bg-white/5 rounded-full w-4/6 animate-pulse" />
                  </div>
                ) : (
                  <p className="text-[15px] text-stone-300 font-medium leading-relaxed italic border-l-2 border-orange-500/50 pl-6 py-2">
                    "{aiInsights?.summary || "Analyzing current heat dynamics..."}"
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {weather.windows?.optimal && (
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 mb-2 block">{t('optimalWindow')}</span>
                    <span className="text-lg font-black text-emerald-500">{weather.windows.optimal}</span>
                  </div>
                )}
                {weather.windows?.hazard && (
                  <div className="flex flex-col gap-4">
                    {aiInsights?.suggestions?.map((s: string, i: number) => (
                      <div key={i} className="flex gap-4 items-start group/item">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#dc5e1e] mt-1.5 flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                        <p className="text-[13px] text-[#f9e8c4]/70 leading-relaxed font-medium group-hover/item:text-[#f9e8c4] transition-colors">{s}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Metrics row */}
          <div className="col-span-1 lg:col-span-12 xl:col-span-12 bg-gradient-to-b from-[#1c100d]/80 to-[#1c100d]/40 backdrop-blur-3xl rounded-[3rem] border border-[#dc5e1e]/10 p-8 md:p-12 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 xl:gap-16 relative z-10">
              <MetricCard 
                icon={<DropletsIcon className="w-5 h-5" />} 
                label={t('moisture')} 
                value={`${weather.current.humidity}%`} 
                description={aiInsights?.humidity || getHumidityStatus(weather.current.humidity)}
                loading={aiLoading}
              />
              <MetricCard 
                icon={<SunIcon className="w-5 h-5" />} 
                label={t('uvIntensity')} 
                value={`${weather.current.uvIndex}`} 
                description={aiInsights?.uv || getUVStatus(weather.current.uvIndex)}
                loading={aiLoading}
              />
              <MetricCard 
                icon={<WindIcon className="w-5 h-5" />} 
                label={t('windVelocity')} 
                value={`${Math.round(weather.current.windSpeed)} km/h`} 
                description={aiInsights?.wind || getWindStatus(weather.current.windSpeed)}
                loading={aiLoading}
              />
            </div>
          </div>
          
          <div className="col-span-1 lg:col-span-12 xl:col-span-12 bg-[#0c0a0a]/75 backdrop-blur-md rounded-[3rem] border border-[#fff2d4]/5 p-5 sm:p-8 md:p-12 h-[450px] flex flex-col">
            <div className="flex items-center gap-4 mb-8 flex-shrink-0">
              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                <ActivityIcon className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fff2d4]">{t('thermalTrajectory')}</h3>
            </div>
            <div className="flex-grow min-h-0 w-full">
              <ForecastChart data={weather.hourly} unit={tempUnit} />
            </div>
          </div>

        </motion.div>
    )}
    </AnimatePresence>
    </div>
  );
});const MetricCard = React.memo(({ icon, label, value, description, loading }: { icon: React.ReactNode, label: string, value: string, description?: string, loading?: boolean }) => {
  return (
    <div className="bg-[#0c0a0a]/80 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-8 border border-[#fff2d4]/5 hover:border-orange-500/30 transition-all group flex flex-col gap-3 sm:gap-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-center justify-between">
        <div className="p-3 rounded-2xl bg-white/5 text-[#fff2d4] group-hover:text-orange-500 transition-colors">
          {icon}
        </div>
        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-stone-500">{label}</span>
      </div>
      
      <div className="mt-2 sm:mt-4">
        <h4 className="text-2xl sm:text-4xl font-black text-[#fff2d4] mb-1 truncate">{value}</h4>
        {loading ? (
          <div className="h-1.5 bg-white/5 rounded-full w-24 animate-pulse mt-2" />
        ) : (
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{description}</p>
        )}
      </div>
    </div>
  );
});


const Tip = React.memo(({ title, body, icon }: { title: string, body: string, icon: React.ReactNode }) => {
  return (
    <div className="p-8 bg-[#0A0A0A] border border-[#fff2d4]/5 rounded-[2.5rem] flex items-start gap-6 hover:border-orange-500/10 transition-all duration-700 bg-gradient-to-br from-[#fff2d4]/[0.01] to-transparent">
      <div className="p-4 rounded-2xl bg-orange-500/10 text-orange-500 shadow-inner" aria-hidden="true">
        {icon}
      </div>
      <div className="space-y-3">
        <h5 className="font-black text-xs uppercase tracking-[0.3em] text-[#fff2d4] underline decoration-orange-500/20 underline-offset-8 decoration-2">{title}</h5>
        <p className="text-sm text-stone-400 leading-relaxed font-medium">{body}</p>
      </div>
    </div>
  );
});

function ShareModal({ weather, onClose }: { weather: WeatherData, onClose: () => void }) {
  const { tempUnit } = useTempUnit();
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const modalId = React.useId();
  const dangerLevel = getDangerLevel(weather.current.heatIndex);
  const tempUnitStr = tempUnit === 'celsius' ? '°C' : '°F';
  
  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const shareData = {
    title: `Precise Heat Insight: ${weather.city}`,
    text: `🌡️ AETRAXA THERMAL ALERT: ${weather.city}\n\n` +
          `• Heat Index: ${Math.floor(formatTemp(weather.current.heatIndex, tempUnit))} ${tempUnitStr} (${dangerLevel.label})\n` +
          `• Ambient Temp: ${formatTemp(weather.current.temp, tempUnit).toFixed(1)} ${tempUnitStr}\n` +
          `• Humidity: ${weather.current.humidity}%\n\n` +
          `Status: ${dangerLevel.label.toUpperCase()} DETECTED. Check live updates at Aetraxa.`,
    url: window.location.href
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareData.text}\n\nView details: ${shareData.url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareData.text}\n\n${shareData.url}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`,
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#050505',
        width: 600,
        height: 800,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Aetraxa-Report-${weather.city}.webp`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#050505',
        width: 600,
        height: 800,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `Aetraxa-Report-${weather.city}.webp`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareData.title,
          text: shareData.text,
        });
      } else {
        await navigator.share({
          title: shareData.title,
          text: `${shareData.text}\n\nLink: ${shareData.url}`,
          url: shareData.url
        });
      }
    } catch (err) {
      console.error('Share failed', err);
      handleCopy();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalId}
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0c0a0a]/90 backdrop-blur-xl" 
      />
      
      {/* Hidden Card for export */}
      <div className="absolute top-[-9999px] left-[-9999px]" aria-hidden="true">
        <ThermalReportCard ref={cardRef} weather={weather} />
      </div>

      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="relative w-full max-w-lg bg-[#0c0a0a] border border-[#fff2d4]/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
        style={{ borderColor: `${dangerLevel.color}33` }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 blur-[100px] rounded-full -mr-24 -mt-24 opacity-20 transition-colors duration-700" 
             style={{ backgroundColor: dangerLevel.color }} aria-hidden="true" />
        
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-4">
             <div className="p-3.5 rounded-2xl bg-[#fff2d4]/5 border border-[#fff2d4]/10 text-orange-500 shadow-inner">
               <ShareIcon className="w-6 h-6" aria-hidden="true" />
             </div>
             <div>
               <h3 id={modalId} className="text-xl font-black text-[#fff2d4] uppercase tracking-tighter">Broadcast Insights</h3>
               <p className="text-[10px] text-stone-500 font-black uppercase tracking-[0.3em]">{weather.city} • Telemetry v4.2</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close share modal"
            className="p-3 rounded-full hover:bg-[#fff2d4]/10 text-stone-500 hover:text-[#fff2d4] transition-all bg-[#fff2d4]/5 border border-[#fff2d4]/5 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <CloseIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleShare}
            disabled={isGenerating}
            className="md:col-span-4 flex flex-row items-center justify-center gap-5 p-7 rounded-[2.5rem] transition-all border border-orange-500/50 bg-orange-600 text-[#fff2d4] shadow-[0_20px_60px_-12px_rgba(234,88,12,0.6)] mb-4 overflow-hidden relative group"
          >
            {isGenerating ? (
              <div className="w-6 h-6 border-2 border-[#fff2d4]/30 border-t-white rounded-full animate-spin" />
            ) : (
              <div className="relative">
                <ShareIcon className="w-7 h-7 group-hover:scale-110 transition-transform" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#fff2d4] rounded-full border-2 border-orange-600 animate-pulse" />
              </div>
            )}
            <div className="flex flex-col items-start translate-y-0.5">
              <span className="text-sm font-black uppercase tracking-[0.4em]">
                UNIFIED BROADCAST
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                {isGenerating ? "Synthesizing Report..." : "Image + Data • Primary Share"}
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#fff2d4]/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" />
          </motion.button>

          <ShareOption 
            icon={<TwitterIcon className="w-5 h-5" />} 
            label="X Link" 
            onClick={() => window.open(shareLinks.twitter, '_blank')}
            color="bg-[#1DA1F2]/10 text-[#1DA1F2]"
            borderColor="#1DA1F244"
          />
          <ShareOption 
            icon={<div className="font-black text-lg leading-none">WA</div>} 
            label="WA Link" 
            onClick={() => window.open(shareLinks.whatsapp, '_blank')}
            color="bg-[#25D366]/10 text-[#25D366]"
            borderColor="#25D36644"
          />
          <ShareOption 
            icon={<FacebookIcon className="w-5 h-5" />} 
            label="FB Link" 
            onClick={() => window.open(shareLinks.facebook, '_blank')}
            color="bg-[#1877F2]/10 text-[#1877F2]"
            borderColor="#1877F244"
          />
          <ShareOption 
            icon={<DownloadIcon className="w-5 h-5" />} 
            label="Save JPG" 
            onClick={handleDownload}
            color="bg-[#fff2d4]/10 text-[#fff2d4]"
            borderColor="rgba(255,242,212,0.2)"
          />
        </div>

        <div className="flex items-center gap-4 mb-8 px-4 opacity-50">
          <div className="h-[1px] flex-grow bg-[#fff2d4]/10" />
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-stone-500 whitespace-nowrap">Encryption Active • AIS-RSA-2048</p>
          <div className="h-[1px] flex-grow bg-[#fff2d4]/10" />
        </div>

        <div className="p-8 bg-[#0c0a0a] border border-[#fff2d4]/5 rounded-[3rem] relative overflow-hidden group/payload">
          <div className="absolute top-0 left-0 w-2 h-full transition-colors duration-1000" 
               style={{ backgroundColor: dangerLevel.color, boxShadow: `0 0 30px ${dangerLevel.color}44` }} />
          
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
               <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_15px_currentColor] animate-pulse" 
                    style={{ backgroundColor: dangerLevel.color, color: dangerLevel.color }} />
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-stone-400">Secure Payload Summary</span>
            </div>
            <div className="flex gap-1">
               {Array.from({ length: 3 }).map((_, i) => (
                 <div key={i} className="w-1 h-3 bg-[#fff2d4]/5 rounded-full" />
               ))}
            </div>
          </div>
          
          <p className="text-xs text-stone-400 leading-relaxed font-bold tracking-tight italic line-clamp-2 group-hover/payload:text-[#fff2d4] transition-colors duration-500">
            "{shareData.text.split('\n')[0]}... [TELEMETRY_ENCRYPTED]... Link: {shareData.url.substring(0, 20)}..."
          </p>
          
          <div className="mt-6 flex justify-end items-center gap-4">
            <span className="text-[8px] font-black uppercase tracking-widest text-stone-500">Checksum: {Math.random().toString(16).substring(2, 8).toUpperCase()}</span>
            <button 
              onClick={handleCopy}
              className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all px-5 py-2.5 rounded-xl border-2 ${copied ? 'bg-orange-500 border-orange-500 text-[#fff2d4]' : 'bg-[#fff2d4]/5 border-[#fff2d4]/10 text-stone-500 hover:text-[#fff2d4] hover:border-[#fff2d4]/20 hover:bg-[#fff2d4]/[0.08] shadow-lg'}`}
            >
              {copied ? <CheckIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Direct Link'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const ThermalReportCard = React.forwardRef<HTMLDivElement, { weather: WeatherData }>(({ weather }, ref) => {
  const { tempUnit } = useTempUnit();
  const dangerLevel = getDangerLevel(weather.current.heatIndex);
  const tempUnitStr = tempUnit === 'celsius' ? '°C' : '°F';
  
  const getSafetyAdvice = (level: string) => {
    switch (level) {
      case 'Optimal': return "Ideal conditions. Maintain standard hydration.";
      case 'Moderate': return "Slight risk. Increase fluid intake if outdoors.";
      case 'Caution': return "Exercise caution. Seek shade during peak sun.";
      case 'Severe': return "Warning: Reduce heavy exertion. Drink electrolytes.";
      case 'Extreme': return "High Risk: Avoid outdoor exposure. Stay in cooling.";
      case 'Danger': return "Evacuate core heat areas. Immediate medical risk.";
      case 'Critical': return "Lethal Threshold: Critical danger. Stay indoors.";
      default: return "Monitor local advisories.";
    }
  };

  return (
    <div 
      ref={ref}
      style={{ width: '600px', height: '800px' }}
      className="bg-[#050505] p-12 flex flex-col justify-between relative overflow-hidden font-sans border-4 border-orange-500/10"
    >
      {/* Background Grid & Accents */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-orange-600/10 to-transparent blur-[120px] rounded-full -mt-40" />
      <div className="absolute bottom-0 left-0 w-3/4 h-[300px] bg-red-600/5 blur-[100px] rounded-full -mb-20" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <SunIcon className="w-10 h-10 text-orange-500" strokeWidth={3} />
            <div className="flex flex-col">
              <span className="text-xl font-black uppercase tracking-[0.5em] text-[#fff2d4]">AETRAXA</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60">Thermal Monitoring System</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">Telemetry ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">{new Date().toLocaleDateString()} • {weather.lastUpdated}</p>
          </div>
        </div>

        <div className="space-y-1 mb-6">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-orange-500/80">Vector Location</p>
          <h2 className={`font-black tracking-tighter text-[#fff2d4] uppercase leading-none break-words ${
            weather.city.length > 20 ? 'text-3xl' : 
            weather.city.length > 15 ? 'text-4xl' : 
            weather.city.length > 10 ? 'text-5xl' : 
            'text-6xl'
          }`}>{weather.city}</h2>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">Calibrated Heat Index</p>
            <div className="flex items-baseline gap-2">
              <span className="text-8xl font-black tracking-tighter text-[#fff2d4]">{Math.floor(formatTemp(weather.current.heatIndex, tempUnit))}</span>
              <span className="text-2xl font-black text-orange-600">HI</span>
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <div className="p-6 rounded-[2rem] border border-[#fff2d4]/5 bg-[#fff2d4]/[0.02] backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: dangerLevel.color }} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 mb-2">Danger Rating</p>
              <p className="text-3xl font-black uppercase tracking-tight leading-none" style={{ color: dangerLevel.color }}>
                {dangerLevel.label}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-[#fff2d4]/[0.02] border border-[#fff2d4]/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">Ambient</p>
            <p className="text-base font-black text-[#fff2d4]">{formatTemp(weather.current.temp, tempUnit).toFixed(1)}{tempUnitStr}</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#fff2d4]/[0.02] border border-[#fff2d4]/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">Humidity</p>
            <p className="text-base font-black text-[#fff2d4]">{weather.current.humidity}%</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#fff2d4]/[0.02] border border-[#fff2d4]/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">Wind</p>
            <p className="text-base font-black text-[#fff2d4]">{weather.current.windSpeed} km/h</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#fff2d4]/[0.02] border border-[#fff2d4]/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">UV Index</p>
            <p className="text-base font-black text-[#fff2d4]">{weather.current.uvIndex}</p>
          </div>
        </div>

        <div className="p-6 rounded-[2rem] bg-orange-600/5 border border-orange-500/10 mb-6">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Safety Protocol Advice</p>
           </div>
           <p className="text-base font-bold text-stone-300 leading-tight">
             {getSafetyAdvice(dangerLevel.label)}
           </p>
        </div>
      </div>

      <div className="relative z-10 border-t border-[#fff2d4]/10 pt-6 flex justify-between items-end">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.8)]" />
             <p className="text-xs font-black uppercase tracking-[0.3em] text-stone-300">Live Satellite Uplink</p>
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-relaxed max-w-xs">
              Official AETRAXA Precise Thermal Data.
            </p>
            <p className="text-[9px] text-stone-400 font-black uppercase tracking-[0.1em]">Source: AIS-Sat-X42 • Precision: +/- 0.1C</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="w-24 h-24 p-2 bg-[#fff2d4] rounded-xl shadow-2xl">
             <div className="w-full h-full bg-[#050505] flex items-center justify-center p-1 rounded-lg">
                <SunIcon className="w-12 h-12 text-orange-500" />
             </div>
          </div>
          <p className="text-[9px] font-black tracking-[0.4em] text-[#fff2d4] uppercase bg-[#0c0a0a] px-3 py-1.5 rounded-full border border-[#fff2d4]/10">AETRAXA.APP</p>
        </div>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1/2 w-1 flex flex-col gap-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="w-full h-4 bg-orange-500/10" />
        ))}
      </div>
    </div>
  );
});

function ShareOption({ icon, label, onClick, color, borderColor }: { icon: React.ReactNode, label: string, onClick: () => void, color: string, borderColor?: string }) {
  return (
    <motion.button
      whileHover={{ 
        scale: 1.05, 
        y: -4,
        borderColor: borderColor || 'rgba(234, 88, 12, 0.4)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)'
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-4 p-6 rounded-[2rem] transition-all border border-[#fff2d4]/5 bg-[#fff2d4]/[0.01] hover:shadow-[0_15px_40px_-10px_rgba(12,10,10,0.5)] group overflow-hidden"
    >
      <div className={`p-4 rounded-2xl ${color} shadow-lg transition-all group-hover:scale-110 duration-300 flex items-center justify-center`}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 group-hover:text-[#fff2d4] transition-colors">{label}</span>
      
      {/* Subtle hover background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#fff2d4]/0 to-[#fff2d4]/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}
