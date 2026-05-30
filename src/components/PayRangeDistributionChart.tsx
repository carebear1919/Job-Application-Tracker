import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PayRangeDistributionChartProps {
  jobs: any[];
  theme: 'dark' | 'light';
  primaryColor?: string;
}

interface CustomPayRangeTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  theme: 'dark' | 'light';
}

const CustomPayRangeTooltip = ({ active, payload, theme }: CustomPayRangeTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        "border p-3 rounded-lg shadow-lg",
        theme === 'dark' ? "bg-[#09090b] border-slate-800" : "bg-white border-slate-200"
      )}>
        <p className="text-xs font-bold uppercase mb-1 text-emerald-500">
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

// Helper function to extract salary from pay range string
const extractSalaryRange = (payRange: string | undefined): [number, number] | null => {
  if (!payRange) return null;
  
  const match = payRange.match(/(\d+)k?(?:\s*-\s*)?(\d+)?k?/i);
  if (match) {
    const min = parseInt(match[1]) * 1000;
    const max = match[2] ? parseInt(match[2]) * 1000 : min;
    return [min, max];
  }
  return null;
};

// Categorize salary into ranges
const categorizePayRange = (minSalary: number, maxSalary: number): string => {
  const avgSalary = (minSalary + maxSalary) / 2;
  
  if (avgSalary < 50000) return '< 50k';
  if (avgSalary < 100000) return '50k - 100k';
  if (avgSalary < 150000) return '100k - 150k';
  if (avgSalary < 200000) return '150k - 200k';
  return '200k+';
};

export const PayRangeDistributionChart: React.FC<PayRangeDistributionChartProps> = ({ 
  jobs, 
  theme,
  primaryColor = '#6366f1'
}) => {
  const chartData = useMemo(() => {
    const payRangeMap: Record<string, number> = {
      '< 50k': 0,
      '50k - 100k': 0,
      '100k - 150k': 0,
      '150k - 200k': 0,
      '200k+': 0,
      'Not Specified': 0
    };

    jobs.forEach(job => {
      const salaryRange = extractSalaryRange(job.payRange);
      
      if (salaryRange) {
        const category = categorizePayRange(salaryRange[0], salaryRange[1]);
        payRangeMap[category]++;
      } else {
        payRangeMap['Not Specified']++;
      }
    });

    return [
      { name: '< 50k', value: payRangeMap['< 50k'] },
      { name: '50k - 100k', value: payRangeMap['50k - 100k'] },
      { name: '100k - 150k', value: payRangeMap['100k - 150k'] },
      { name: '150k - 200k', value: payRangeMap['150k - 200k'] },
      { name: '200k+', value: payRangeMap['200k+'] },
      { name: 'Not Specified', value: payRangeMap['Not Specified'] }
    ].filter(item => item.value > 0);
  }, [jobs]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-500">
        <p>No pay range data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#27272a" : "#e2e8f0"} />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8"
            fontSize={11}
            tick={{ fontWeight: 500 }}
          />
          <YAxis 
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: theme === 'dark' ? '#27272a' : '#f1f5f9' }} content={<CustomPayRangeTooltip theme={theme} />} />
          <Bar dataKey="value" fill={primaryColor} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
