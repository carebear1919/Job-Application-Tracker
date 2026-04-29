import React from 'react';
import { Funnel, FunnelChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConversionFunnelProps {
  jobs: any[];
  theme: 'dark' | 'light';
  colors?: {
    primary: string;
    accent: string;
    offer: string;
  };
}

interface FunnelData {
  name: string;
  value: number;
  fill: string;
}

const CustomFunnelTooltip = ({ active, payload, theme }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    const percentage = data.percentage || 0;
    return (
      <div className={cn(
        "border p-3 rounded-lg shadow-lg",
        theme === 'dark' ? "bg-[#09090b] border-slate-800" : "bg-white border-slate-200"
      )}>
        <p className="text-xs font-bold text-slate-400 uppercase mb-1">{data.name}</p>
        <p className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>
          {data.value} applications
        </p>
        <p className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}% of pipeline</p>
      </div>
    );
  }
  return null;
};

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({ jobs, theme, colors }) => {
  // Calculate funnel stages: Applied -> Interviewing (+ Technical) -> Offer
  const applied = jobs.length;
  const interviewing = jobs.filter(j => j.status === 'Interviewing' || j.status === 'Technical').length;
  const offers = jobs.filter(j => j.status === 'Offer').length;

  const data: FunnelData[] = [
    {
      name: 'Applied',
      value: applied,
      fill: colors?.primary || '#6366f1', // Indigo
      percentage: 100,
    },
    {
      name: 'Interviewing',
      value: interviewing,
      fill: colors?.accent || '#8b5cf6', // Purple
      percentage: applied > 0 ? (interviewing / applied) * 100 : 0,
    },
    {
      name: 'Offer',
      value: offers,
      fill: colors?.offer || '#10b981', // Green
      percentage: applied > 0 ? (offers / applied) * 100 : 0,
    },
  ];

  // Calculate conversion percentages
  const appliedToInterview = applied > 0 ? ((interviewing / applied) * 100).toFixed(1) : 0;
  const interviewToOffer = interviewing > 0 ? ((offers / interviewing) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart margin={{ top: 20, right: 160, bottom: 20, left: 0 }}>
            <Tooltip content={<CustomFunnelTooltip theme={theme} />} />
            <Funnel
              dataKey="value"
              data={data}
              fill="#6366f1"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className={cn(
          "p-4 rounded-lg border",
          theme === 'dark' ? "bg-slate-900/30 border-slate-800" : "bg-slate-50 border-slate-200"
        )}>
          <p className={cn("text-xs font-bold uppercase tracking-widest mb-2", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
            Applied → Interview
          </p>
          <p className="text-2xl font-bold text-indigo-500">{appliedToInterview}%</p>
          <p className={cn("text-xs mt-1", theme === 'dark' ? "text-slate-500" : "text-slate-600")}>
            {interviewing} of {applied}
          </p>
        </div>
        <div className={cn(
          "p-4 rounded-lg border",
          theme === 'dark' ? "bg-slate-900/30 border-slate-800" : "bg-slate-50 border-slate-200"
        )}>
          <p className={cn("text-xs font-bold uppercase tracking-widest mb-2", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
            Interview → Offer
          </p>
          <p className="text-2xl font-bold text-emerald-500">{interviewToOffer}%</p>
          <p className={cn("text-xs mt-1", theme === 'dark' ? "text-slate-500" : "text-slate-600")}>
            {offers} of {interviewing}
          </p>
        </div>
      </div>
    </div>
  );
};
