import React from 'react';
import { useLanguage } from '../LanguageContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface HourlyForecast {
  time: string;
  temp: number;
  humidity: number;
  heatIndex: number;
}

interface ForecastChartProps {
  data: HourlyForecast[];
  unit?: 'celsius' | 'fahrenheit';
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  const { language } = useLanguage();
  if (active && payload && payload.length) {
    const isUrdu = language === 'ur';
    return (
      <div className="bg-black border border-white/10 p-4 rounded-2xl backdrop-blur-xl shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm font-black text-white flex justify-between gap-4">
            <span className="text-white/40 font-bold uppercase tracking-wider text-[10px]">
              {isUrdu ? "درجہ حرارت" : "Temperature"}
            </span>
            <span>{payload[0].value.toFixed(1)}{unit === 'fahrenheit' ? '°F' : '°C'}</span>
          </p>
          <p className="text-sm font-black text-primary-accent flex justify-between gap-4">
            <span className="text-primary-accent/60 font-bold uppercase tracking-wider text-[10px]">
              {isUrdu ? "گرمی کا اشاریہ (Heat Index)" : "Heat Index"}
            </span>
            <span>{payload[1].value.toFixed(1)}{unit === 'fahrenheit' ? '°F' : '°C'}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const ForecastChart = React.memo(({ data, unit = 'celsius' }: ForecastChartProps) => {
  const displayData = data.map(d => ({
    ...d,
    temp: unit === 'fahrenheit' ? (d.temp * 9) / 5 + 32 : d.temp,
    heatIndex: unit === 'fahrenheit' ? (d.heatIndex * 9) / 5 + 32 : d.heatIndex
  }));

  return (
    <div className="w-full h-full" role="region" aria-label="24-hour thermal trajectory chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={displayData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fff2d0" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#fff2d0" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorHI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d6501f" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#d6501f" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fff2d005" />
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#fff2d044', fontSize: 10, fontWeight: 700 }}
            interval={3}
            minTickGap={20}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#fff2d044', fontSize: 10, fontWeight: 700 }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} isAnimationActive={false} />
          <Area 
            type="monotone" 
            dataKey="temp" 
            name="Temperature"
            stroke="#fff2d0" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorTemp)" 
            isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            dataKey="heatIndex" 
            name="Heat Index"
            stroke="#d6501f" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorHI)" 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
