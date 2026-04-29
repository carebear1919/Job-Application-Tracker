import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type JobStatus = 'Applied' | 'Interviewing' | 'Technical' | 'Offer' | 'Rejected' | 'Ghosted';

interface StatusBreakdownDonutProps {
  jobs: any[];
  theme: 'dark' | 'light';
  colors?: Record<string, string>;
}

const DEFAULT_STATUS_COLORS: Record<JobStatus, string> = {
  Applied: '#6366f1',
  Interviewing: '#8b5cf6',
  Technical: '#f59e0b',
  Offer: '#10b981',
  Rejected: '#ef4444',
  Ghosted: '#71717a',
};

interface CustomStatusTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string; payload: { percentage: number } }>;
  theme: 'dark' | 'light';
}

const CustomStatusTooltip = ({ active, payload, theme }: CustomStatusTooltipProps) => {
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

export const StatusBreakdownDonut: React.FC<StatusBreakdownDonutProps> = ({ jobs, theme, colors }) => {
  // Map the colors object to STATUS_COLORS with proper keys
  const STATUS_COLORS: Record<JobStatus, string> = {
    Applied: colors?.applied || DEFAULT_STATUS_COLORS.Applied,
    Interviewing: colors?.interviewing || DEFAULT_STATUS_COLORS.Interviewing,
    Technical: colors?.technical || DEFAULT_STATUS_COLORS.Technical,
    Offer: colors?.offer || DEFAULT_STATUS_COLORS.Offer,
    Rejected: colors?.rejected || DEFAULT_STATUS_COLORS.Rejected,
    Ghosted: colors?.ghosted || DEFAULT_STATUS_COLORS.Ghosted,
  };
  
  // Count jobs by status
  const statusCounts: Record<JobStatus, number> = {
    Applied: 0,
    Interviewing: 0,
    Technical: 0,
    Offer: 0,
    Rejected: 0,
    Ghosted: 0,
  };

  jobs.forEach(job => {
    statusCounts[job.status as JobStatus]++;
  });

  const total = jobs.length;
  const statusData = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status,
      value: count,
      fill: STATUS_COLORS[status as JobStatus],
      percentage: (count / total) * 100,
    }));

  return (
    <div>
      <div className="h-64 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={6}
              dataKey="value"
              stroke="none"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomStatusTooltip theme={theme} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold">{total}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Apps</span>
        </div>
      </div>

      {/* Status Legend with counts */}
      <div className="grid grid-cols-2 gap-2 mt-6">
        {statusData.map(({ name, value, fill, percentage }) => (
          <div key={name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: fill }}
            />
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-semibold truncate", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                {name}
              </p>
              <p className={cn("text-xs", theme === 'dark' ? "text-slate-500" : "text-slate-500")}>
                {value} ({percentage.toFixed(0)}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
