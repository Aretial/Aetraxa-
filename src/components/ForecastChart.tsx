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
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0c0a0a] border border-[#fff2d4]/10 p-4 rounded-2xl backdrop-blur-xl shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm font-black text-[#fff2d4] flex justify-between gap-4">
            <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px]">Temperature</span>
            <span>{payload[0].value.toFixed(1)}{unit === 'fahrenheit' ? '°F' : '°C'}</span>
          </p>
          <p className="text-sm font-black text-orange-500 flex justify-between gap-4">
            <span className="text-orange-500/60 font-bold uppercase tracking-wider text-[10px]">Heat Index</span>
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
              <stop offset="5%" stopColor="#fff2d4" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#fff2d4" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorHI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#db6321" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#db6321" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fff2d405" />
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#78716c', fontSize: 10, fontWeight: 700 }}
            interval={3}
            minTickGap={20}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#78716c', fontSize: 10, fontWeight: 700 }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} isAnimationActive={false} />
          <Area 
            type="monotone" 
            dataKey="temp" 
            name="Temperature"
            stroke="#fff2d4" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorTemp)" 
            isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            dataKey="heatIndex" 
            name="Heat Index"
            stroke="#db6321" 
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
