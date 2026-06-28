import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useLanguage } from '../LanguageContext';

interface HourlyAqi {
  time: string;
  aqi: number;
  pm10: number;
  pm2_5: number;
}

interface AqiForecastChartProps {
  data: HourlyAqi[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const { language } = useLanguage();
  if (active && payload && payload.length) {
    const isUrdu = language === 'ur';
    return (
      <div className="bg-black border border-white/10 p-4 rounded-2xl backdrop-blur-xl shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm font-black text-[#52b72c] flex justify-between gap-4">
            <span className="text-[#52b72c]/60 font-bold uppercase tracking-wider text-[10px]">
              {isUrdu ? "یورپی فضا انڈیکس" : "European AQI"}
            </span>
            <span>{payload[0].value}</span>
          </p>
          {payload[1] && (
            <p className="text-sm font-black text-blue-400 flex justify-between gap-4">
              <span className="text-blue-400/60 font-bold uppercase tracking-wider text-[10px]">
                {isUrdu ? "باریک دھول ذرات (PM2.5)" : "PM2.5"}
              </span>
              <span>{payload[1].value} μg/m³</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const AqiForecastChart = React.memo(({ data }: AqiForecastChartProps) => {
  return (
    <div className="w-full h-full" role="region" aria-label="24-hour AQI trajectory chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#52b72c" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#52b72c" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPm25" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#edffde" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#edffde" stopOpacity={0}/>
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
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
          <Area 
            type="monotone" 
            dataKey="aqi" 
            name="European AQI"
            stroke="#52b72c" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorAqi)" 
            isAnimationActive={false}
            activeDot={{ r: 6, stroke: '#52b72c', strokeWidth: 2, fill: '#ffffff' }}
          />
          <Area 
            type="monotone" 
            dataKey="pm2_5" 
            name="PM2.5"
            stroke="#edffde" 
            strokeWidth={1.5}
            fillOpacity={1} 
            fill="url(#colorPm25)" 
            isAnimationActive={false}
            activeDot={{ r: 5, stroke: '#edffde', strokeWidth: 1.5, fill: '#020402' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
