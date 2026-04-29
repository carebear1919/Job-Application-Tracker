import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getWeek, startOfWeek, format, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WeeklyVolumeChartProps {
  jobs: any[];
  theme: 'dark' | 'light';
}

const CustomWeeklyTooltip = ({ active, payload, theme }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        "border p-3 rounded-lg shadow-lg",
        theme === 'dark' ? "bg-[#09090b] border-slate-800" : "bg-white border-slate-200"
      )}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          {payload[0].payload.weekRange}
        </p>
        <p className={cn("text-lg font-bold")}>
          {payload[0].value} <span className="text-xs font-normal text-slate-500">Applications</span>
        </p>
      </div>
    );
  }
  return null;
};

export const WeeklyVolumeChart: React.FC<WeeklyVolumeChartProps> = ({ jobs, theme }) => {
  const data = useMemo(() => {
    const weekMap = new Map<string, { count: number; date: Date }>();

    jobs.forEach(job => {
      const jobDate = parseISO(job.date);
      const weekStart = startOfWeek(jobDate, { weekStartsOn: 1 }); // Monday start
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { count: 0, date: weekStart });
      }
      weekMap.get(weekKey)!.count++;
    });

    // Sort by date and format for display
    return Array.from(weekMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ count, date }) => {
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekRange = `${format(date, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`;
        return {
          week: format(date, 'MMM dd'),
          weekRange,
          count,
        };
      });
  }, [jobs]);

  // Find max count for scaling purposes
  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Color bars based on threshold
  const getBarColor = (count: number) => {
    if (count >= maxCount * 0.7) return '#10b981'; // Green - high volume
    if (count >= maxCount * 0.4) return '#6366f1'; // Indigo - medium volume
    return '#f59e0b'; // Amber - low volume
  };

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={theme === 'dark' ? "#27272a" : "#e2e8f0"} 
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              dataKey="week" 
              stroke={theme === 'dark' ? "#71717a" : "#94a3b8"}
              fontSize={12}
              tick={{ fontWeight: 500 }}
            />
            <YAxis 
              stroke={theme === 'dark' ? "#71717a" : "#94a3b8"}
              fontSize={12}
              tick={{ fontWeight: 500 }}
              width={40}
            />
            <Tooltip cursor={{ fill: theme === 'dark' ? '#27272a' : '#f1f5f9' }} content={<CustomWeeklyTooltip theme={theme} />} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={48}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.count)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className={cn(
            "p-3 rounded-lg border text-center",
            theme === 'dark' ? "bg-slate-900/30 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
              Avg/Week
            </p>
            <p className="text-xl font-bold text-indigo-500">
              {(data.reduce((sum, d) => sum + d.count, 0) / data.length).toFixed(1)}
            </p>
          </div>
          <div className={cn(
            "p-3 rounded-lg border text-center",
            theme === 'dark' ? "bg-slate-900/30 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
              Peak Week
            </p>
            <p className="text-xl font-bold text-emerald-500">
              {Math.max(...data.map(d => d.count))}
            </p>
          </div>
          <div className={cn(
            "p-3 rounded-lg border text-center",
            theme === 'dark' ? "bg-slate-900/30 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
              Weeks
            </p>
            <p className="text-xl font-bold text-purple-500">
              {data.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
