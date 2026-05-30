import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SourceDistributionChartProps {
  jobs: any[];
  theme: 'dark' | 'light';
}

interface CustomSourceTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string; payload: { percentage: number } }>;
  theme: 'dark' | 'light';
}

// Vibrant color palette for sources
const SOURCE_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#d946ef', // Magenta
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#1e40af', // Blue-dark
];

const CustomSourceTooltip = ({ active, payload, theme }: CustomSourceTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        "border p-3 rounded-lg shadow-lg",
        theme === 'dark' ? "bg-[#09090b] border-slate-800" : "bg-white border-slate-200"
      )}>
        <p className="text-xs font-bold uppercase mb-1" style={{ color: payload[0].fill }}>
          {payload[0].name}
        </p>
        <p className={cn("text-sm font-bold")}>
          {payload[0].value} <span className="text-xs font-normal text-slate-500">Applications</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">{payload[0].payload.percentage.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export const SourceDistributionChart: React.FC<SourceDistributionChartProps> = ({ 
  jobs, 
  theme
}) => {
  const chartData = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    let totalJobs = 0;
    
    jobs.forEach(job => {
      const source = job.source || 'Unknown';
      sourceMap[source] = (sourceMap[source] || 0) + 1;
      totalJobs++;
    });

    return Object.entries(sourceMap)
      .map(([ source, count ], index) => ({
        name: source,
        value: count,
        percentage: (count / totalJobs) * 100
      }))
      .sort((a, b) => b.value - a.value);
  }, [jobs]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-500">
        <p>No source data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            fill="#6366f1"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip cursor={{ fill: theme === 'dark' ? '#27272a' : '#f1f5f9' }} content={<CustomSourceTooltip theme={theme} />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            wrapperStyle={{
              paddingTop: '20px'
            }}
            formatter={(value, entry) => (
              <span className={cn("text-xs font-medium", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
