import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LocationDistributionChartProps {
  jobs: any[];
  theme: 'dark' | 'light';
  primaryColor?: string;
}

interface CustomLocationTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  theme: 'dark' | 'light';
}

const CustomLocationTooltip = ({ active, payload, theme }: CustomLocationTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        "border p-3 rounded-lg shadow-lg",
        theme === 'dark' ? "bg-[#09090b] border-slate-800" : "bg-white border-slate-200"
      )}>
        <p className="text-xs font-bold uppercase mb-1 text-indigo-500">
          {payload[0].name}
        </p>
        <p className={cn("text-sm font-bold")}>
          {payload[0].value} <span className="text-xs font-normal text-slate-500">Jobs</span>
        </p>
      </div>
    );
  }
  return null;
};

export const LocationDistributionChart: React.FC<LocationDistributionChartProps> = ({ 
  jobs, 
  theme,
  primaryColor = '#6366f1'
}) => {
  const chartData = useMemo(() => {
    const locationMap: Record<string, number> = {};
    
    jobs.forEach(job => {
      const location = job.location || 'Not Specified';
      locationMap[location] = (locationMap[location] || 0) + 1;
    });

    return Object.entries(locationMap)
      .map(([location, count]) => ({
        name: location,
        value: count
      }))
      .sort((a, b) => b.value - a.value);
  }, [jobs]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-500">
        <p>No location data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#27272a" : "#e2e8f0"} />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8"
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontWeight: 500 }}
          />
          <YAxis 
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: theme === 'dark' ? '#27272a' : '#f1f5f9' }} content={<CustomLocationTooltip theme={theme} />} />
          <Bar dataKey="value" fill={primaryColor} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
