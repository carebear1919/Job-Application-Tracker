import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, 
  Cell as RechartsCell
} from 'recharts';
import { 
  Search, Plus, ExternalLink, Briefcase, 
  CheckCircle2, Clock, XCircle, TrendingUp, Filter,
  LayoutDashboard, ListTodo, Target, Trophy,
  ChevronRight, Sun, Moon, X, Send, Command,
  User, Tag, FileText, AlertCircle, Calendar,
  MessageSquare, Terminal, Settings, Eye, Edit2, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, differenceInDays, parseISO, differenceInMinutes, differenceInHours, format } from 'date-fns';
import { ContactModal, type Contact as ModalContact } from './components/ContactModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useThemeCustomization } from './hooks/useThemeCustomization';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBreakdownDonut } from './components/StatusBreakdownDonut';
import { WeeklyVolumeChart } from './components/WeeklyVolumeChart';
import { LocationDistributionChart } from './components/LocationDistributionChart';
import { PayRangeDistributionChart } from './components/PayRangeDistributionChart';
import { SourceDistributionChart } from './components/SourceDistributionChart';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types & Schema ---
type JobStatus = 'Applied' | 'Interviewing' | 'Technical' | 'Offer' | 'Rejected' | 'Ghosted';

interface Contact {
  name: string;
  role?: string;
  email?: string;
  linkedin?: string;
}

interface Job {
  id: string;
  company: string;
  role: string;
  source: string;
  status: JobStatus;
  date: string;
  appliedAt?: string;
  updatedAt: string;
  payRange?: string;
  link: string;
  skills: string[];
  contacts: Contact[];
  notes: string;
  workLocation?: 'Remote' | 'Onsite' | 'Hybrid';
  location?: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
}

const INITIAL_JOBS: Job[] = [];

const STATUS_COLORS: Record<JobStatus, string> = {
  Applied: '#6366f1',
  Interviewing: '#8b5cf6',
  Technical: '#f59e0b',
  Offer: '#10b981',
  Rejected: '#ef4444',
  Ghosted: '#71717a',
};

const COMMON_SOURCES = [
  'Indeed', 'LinkedIn', 'Jobstreet', 'FlexJobs', 'Glassdoor', 
  'Monster', 'CareerBuilder', 'Reddit', 'Company Website', 
  'Referral', 'Networking', 'Job Fair', 'Social Media', 'Agency'
].sort();

const COMMON_SKILLS = [
  'React', 'TypeScript', 'Next.js', 'Tailwind', 'Node.js', 
  'PostgreSQL', 'AWS', 'Docker', 'Python', 'Go', 'Rust', 'Ruby',
  'UI Design', 'Figma', 'System Design', 'Testing'
].sort();

const WORK_LOCATIONS = ['Remote', 'Onsite', 'Hybrid'];

const ITEMS_PER_PAGE = 10;

// --- Type Interfaces ---

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactElement;
  trend?: string;
  colorVar: string;
  delay: number;
  theme: 'dark' | 'light';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  theme: 'dark' | 'light';
}

// --- Helper Functions ---
function formatTimeAgo(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = new Date();
  const minutes = differenceInMinutes(now, date);
  const hours = differenceInHours(now, date);
  const days = differenceInDays(now, date);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatAppliedDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'MMM d, yyyy h:mm a');
}

// --- Components ---

const StatCard = React.memo(({ label, value, icon, trend, colorVar, delay, theme }: StatCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={cn(
      "p-6 flex items-start justify-between group transition-all duration-300",
      theme === 'dark' ? "glass-card border-slate-800/50 hover:border-indigo-500/50" : "glass-card-light hover:border-indigo-500/50 hover:shadow-md"
    )}
  >
    <div>
      <p className={cn("text-sm font-medium mb-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>{label}</p>
      <h3 className={cn("text-3xl font-bold tracking-tight mb-2", theme === 'dark' ? "text-white" : "text-slate-900")}>{value}</h3>
      {trend && (
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-500">
          <TrendingUp size={12} />
          <span>{trend}</span>
        </div>
      )}
    </div>
    <div 
      className="p-3 rounded-xl bg-opacity-10"
      style={{
        backgroundColor: `var(${colorVar}) / 0.1`,
        color: `var(${colorVar})`
      }}
    >
      {React.cloneElement(icon, { size: 24, className: "text-inherit" } as any)}
    </div>
  </motion.div>
));

const CustomTooltip = React.memo(({ active, payload, theme }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        "border p-3 rounded-xl shadow-xl z-200",
        theme === 'dark' ? "bg-[#09090b] border-slate-800" : "bg-white border-slate-200 shadow-lg text-slate-900"
      )}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{payload[0].name}</p>
        <p className={cn("text-lg font-bold")}>
          {payload[0].value} <span className="text-sm font-normal text-slate-500">Applications</span>
        </p>
      </div>
    );
  }
  return null;
});

// --- Main Application ---

export default function App() {
  const [jobs, setJobs] = useLocalStorage<Job[]>('job_applications', INITIAL_JOBS);
  const [search, setSearch] = useLocalStorage<string>('job_search_query', '');
  const [statusFilter, setStatusFilter] = useLocalStorage<JobStatus | 'All'>('job_status_filter', 'All');
  const [workLocationFilter, setWorkLocationFilter] = useLocalStorage<string>('job_location_type_filter', 'All');
  const [locationFilter, setLocationFilter] = useLocalStorage<string>('job_location_filter', 'All');
  const [sourceFilter, setSourceFilter] = useLocalStorage<string>('job_source_filter', 'All');
  const [currentPage, setCurrentPage] = useLocalStorage<number>('job_current_page', 1);
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('app_theme', 'dark');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage<'default' | 'interview'>('job_view_mode', 'default');
  const [detailViewTab, setDetailViewTab] = useState<'details' | 'contacts' | 'notes'>('details');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useLocalStorage<boolean>('has_seen_welcome', false);
  const [showCharts, setShowCharts] = useLocalStorage<boolean>('show_analytics_charts', false);
  const [expandedQA, setExpandedQA] = useState<Record<number, boolean>>({});
  const [showLearnMore, setShowLearnMore] = useState(false);

  // Theme Customization Hook
  const { colors, updateColor, resetColors } = useThemeCustomization();
  
  // Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  
  // Form State
  const [jobForm, setJobForm] = useState<Partial<Job>>({
    status: 'Applied',
    date: new Date().toISOString().split('T')[0],
    skills: [],
    contacts: [],
    notes: '',
  });
  const [sourceInput, setSourceInput] = useState("");
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Show welcome modal on first visit
  useEffect(() => {
    if (!hasSeenWelcome) {
      setTimeout(() => {
        setShowWelcome(true);
      }, 800);
    }
  }, [hasSeenWelcome]);

  const handleWelcomeDismiss = () => {
    setShowWelcome(false);
    setHasSeenWelcome(true);
  };

  const handleWelcomeStart = () => {
    setShowWelcome(false);
    setHasSeenWelcome(true);
    openAddModal();
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetAllData = () => {
    setShowResetConfirm(true);
    setIsSettingsOpen(false);
  };

  const confirmReset = () => {
    setShowResetConfirm(false);
    setJobs([]);
    setHasSeenWelcome(false);
    setTimeout(() => {
      setShowWelcome(true);
    }, 500);
  };

  const handleShowUserGuide = () => {
    setShowWelcome(true);
  };

  const toggleTheme = () => setTheme((prev: 'dark' | 'light') => prev === 'dark' ? 'light' : 'dark');

  // Shortcut for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openAddModal = useCallback(() => {
    setSelectedJob(null);
    setIsEditMode(true);
    setJobForm({
      status: 'Applied',
      date: new Date().toISOString().split('T')[0],
      appliedAt: new Date().toISOString(),
      company: '',
      role: '',
      payRange: '',
      link: '',
      skills: [],
      contacts: [],
      notes: ''
    });
    setSourceInput("");
    setIsModalOpen(true);
    setIsCommandOpen(false);
  }, []);

  const openEditModal = (job: Job) => {
    setSelectedJob(job);
    setIsEditMode(true);
    setJobForm(job);
    setSourceInput(job.source);
    setIsModalOpen(true);
  };

  const openViewModal = (job: Job) => {
    setSelectedJob(job);
    setIsEditMode(false);
    setJobForm(job);
    setSourceInput(job.source);
    setIsModalOpen(true);
  };

  const handleDeleteJob = (id: string) => {
    setJobs((prev: Job[]) => prev.filter((j: Job) => j.id !== id));
    setIsModalOpen(false);
  };

  const handleOpenContactModal = (contactIndex?: number) => {
    if (contactIndex !== undefined) {
      setEditingContactIndex(contactIndex);
    } else {
      setEditingContactIndex(null);
    }
    setIsContactModalOpen(true);
  };

  const handleSaveContact = (contact: ModalContact) => {
    const newContacts = [...(jobForm.contacts || [])];
    
    if (editingContactIndex !== null) {
      newContacts[editingContactIndex] = contact;
    } else {
      newContacts.push(contact);
    }
    
    setJobForm({ ...jobForm, contacts: newContacts });
    setIsContactModalOpen(false);
    setEditingContactIndex(null);
  };

  const handleDeleteContact = (index: number) => {
    setJobForm({
      ...jobForm,
      contacts: jobForm.contacts?.filter((_, i) => i !== index) || []
    });
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!jobForm.company?.trim()) {
      errors.company = 'Company name is required';
    }
    if (!jobForm.role?.trim()) {
      errors.role = 'Target role is required';
    }
    if (jobForm.link && jobForm.link !== '#' && jobForm.link?.trim() && !isValidUrl(jobForm.link)) {
      errors.link = 'Please enter a valid URL (e.g., https://example.com)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const timestamp = new Date().toISOString().split('T')[0];

    if (selectedJob) {
      setJobs((prev: Job[]) => prev.map((j: Job) => j.id === selectedJob.id ? { 
        ...j, 
        ...jobForm, 
        source: sourceInput,
        appliedAt: j.appliedAt || jobForm.appliedAt || (jobForm.date ? jobForm.date + 'T00:00:00' : j.appliedAt),
        updatedAt: jobForm.status !== j.status ? timestamp : j.updatedAt 
      } as Job : j));
    } else {
      const job: Job = {
        id: Math.random().toString(36).substr(2, 9),
        company: jobForm.company as string,
        role: jobForm.role as string,
        source: sourceInput || 'Direct',
        status: jobForm.status as JobStatus,
        date: jobForm.date as string,
        appliedAt: jobForm.appliedAt || new Date().toISOString(),
        updatedAt: timestamp,
        payRange: jobForm.payRange || undefined,
        link: jobForm.link || '#',
        skills: jobForm.skills || [],
        contacts: jobForm.contacts || [],
        notes: jobForm.notes || '',
        workLocation: jobForm.workLocation,
        location: jobForm.location,
      };
      setJobs((prev: Job[]) => [job, ...prev]);
    }
    
    setIsModalOpen(false);
  };

  // --- Analytics Logic ---
  const { statusData, sourceData, skillData, kpis } = useMemo(() => {
    const statusCounts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sourceCounts = jobs.reduce((acc, job) => {
      acc[job.source] = (acc[job.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const skillCounts = jobs.reduce((acc, job) => {
      job.skills.forEach(skill => {
        acc[skill] = (acc[skill] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const statusChartData = Object.keys(statusCounts).map(key => ({ 
      name: key, 
      value: statusCounts[key],
      fill: STATUS_COLORS[key as JobStatus]
    }));

    const sourceChartData = Object.keys(sourceCounts)
      .map(key => ({ name: key, count: sourceCounts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const skillChartData = Object.keys(skillCounts)
      .map(key => ({ name: key, count: skillCounts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const interviews = jobs.filter(j => ['Interviewing', 'Technical'].includes(j.status)).length;
    const offers = jobs.filter(j => j.status === 'Offer').length;
    
    return {
      statusData: statusChartData,
      sourceData: sourceChartData,
      skillData: skillChartData,
      kpis: {
        total: jobs.length,
        interviews,
        offers,
        rate: jobs.length > 0 ? Math.round(((interviews + offers) / jobs.length) * 100) + '%' : '0%'
      }
    };
  }, [jobs]);

  // Extract available locations from jobs
  const availableLocations = Array.from(
    new Set(jobs.filter(job => job.location).map(job => job.location))
  ).sort() as string[];

  // Extract available sources from jobs
  const availableSources = Array.from(
    new Set(jobs.map(job => job.source))
  ).sort() as string[];

  const filteredJobs = jobs.filter(job => {
    const searchString = `${job.company} ${job.role} ${job.skills.join(' ')}`.toLowerCase();
    const matchesSearch = searchString.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    const matchesWorkLocation = workLocationFilter === 'All' || job.workLocation === workLocationFilter;
    const matchesLocation = locationFilter === 'All' || job.location === locationFilter;
    const matchesSource = sourceFilter === 'All' || job.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesWorkLocation && matchesLocation && matchesSource;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, workLocationFilter, locationFilter, sourceFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startIdx = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedJobs = filteredJobs.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const getStaleLevel = (updatedAt: string) => {
    const days = differenceInDays(new Date(), parseISO(updatedAt));
    if (days >= 14) return 'critical';
    if (days >= 7) return 'warning';
    return 'none';
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 font-sans selection:bg-indigo-500/30",
      theme === 'dark' ? "bg-[#09090b] text-slate-50" : "bg-slate-50 text-slate-900"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Target size={18} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tighter uppercase">Career Pipeline</h1>
            </div>
            <p className={cn("text-sm", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
              Managing your career growth for July 2026 Breakthrough
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 w-full md:w-auto relative"
          >
            <div className={cn(
              "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-widest uppercase",
              theme === 'dark' ? "bg-white/5 border-white/10 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-400 font-bold"
            )}>
              <Command size={12} /> + K
            </div>
            <button 
              onClick={handleShowUserGuide}
              aria-label="Show User Guide"
              className={cn(
                "p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95",
                theme === 'dark' ? "bg-white/5 border-white/10 text-slate-400 hover:text-indigo-400" : "bg-white border-slate-200 text-slate-600 hover:text-indigo-600 shadow-sm"
              )}
            >
              <HelpCircle size={20} />
            </button>
            <button 
              onClick={() => setShowCharts(!showCharts)}
              aria-label={showCharts ? 'Hide analytics charts' : 'Show analytics charts'}
              className={cn(
                "p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95",
                theme === 'dark' ? "bg-white/5 border-white/10 text-slate-400 hover:text-indigo-400" : "bg-white border-slate-200 text-slate-600 hover:text-indigo-600 shadow-sm"
              )}
              title={showCharts ? 'Hide charts' : 'Show charts'}
            >
              <LayoutDashboard size={20} />
            </button>
            <button 
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className={cn(
                "p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95",
                theme === 'dark' ? "bg-white/5 border-white/10 text-amber-400" : "bg-white border-slate-200 text-indigo-600 shadow-sm"
              )}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              aria-label="Settings"
              className={cn(
                "p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95",
                theme === 'dark' ? "bg-white/5 border-white/10 text-slate-400 hover:text-indigo-400" : "bg-white border-slate-200 text-slate-600 hover:text-indigo-600 shadow-sm"
              )}
            >
              <Settings size={20} />
            </button>
            <SettingsPanel
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              theme={theme}
              colors={colors}
              onColorChange={(key: string, value: string) => updateColor(key as any, value)}
              onResetTheme={resetColors}
              jobs={jobs}
              kpis={kpis}
              onResetAllData={handleResetAllData}
            />
            <button 
              onClick={openAddModal}
              className="hidden md:flex bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl items-center justify-center gap-2 transition-all text-sm font-bold shadow-lg shadow-indigo-600/20 active:scale-95 uppercase tracking-widest"
            >
              <Plus size={18} /> New Entry
            </button>
          </motion.div>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard 
            label="Active Applications" 
            value={kpis.total} 
            icon={<Briefcase />} 
            colorVar="--color-primary" 
            trend="+12% activity"
            delay={0}
            theme={theme}
          />
          <StatCard 
            label="In-Cycle Interviews" 
            value={kpis.interviews} 
            icon={<Clock />} 
            colorVar="--color-secondary" 
            delay={0}
            theme={theme}
          />
          <StatCard 
            label="Global Feedback" 
            value={kpis.rate} 
            icon={<TrendingUp />} 
            colorVar="--color-secondary" 
            trend="Positive"
            delay={0}
            theme={theme}
          />
          <StatCard 
            label="Offers Secured" 
            value={kpis.offers} 
            icon={<Trophy />} 
            colorVar="--color-accent" 
            delay={0}
            theme={theme}
          />
        </div>

        {/* Analytics Charts - Conditionally Rendered */}
        {showCharts && (
          <>
            {/* New Analytics Charts */}
            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-6"
              >
                <div className={cn("p-8", theme === 'dark' ? "glass-card border-slate-800/50" : "glass-card-light")}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-8 uppercase tracking-widest text-slate-500">
                    <LayoutDashboard size={14} className="text-indigo-500" />
                    Status Breakdown
                  </h3>
                  <StatusBreakdownDonut jobs={jobs} theme={theme} colors={colors as any} />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-6"
              >
                <div className={cn("p-8 h-full", theme === 'dark' ? "glass-card border-slate-800/50" : "glass-card-light")}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-8 uppercase tracking-widest text-slate-500">
                    <Tag size={14} className="text-indigo-500" />
                    Technical Skill Heatmap
                  </h3>
                  <div className="h-70 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        layout="vertical" 
                        data={skillData} 
                        margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#27272a" : "#e2e8f0"} horizontal={false} vertical={true} />
                        <XAxis type="number" hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                          width={80}
                          tick={{ fontWeight: 600 }}
                        />
                        <Tooltip cursor={{ fill: theme === 'dark' ? '#27272a' : '#f1f5f9' }} content={<CustomTooltip theme={theme} />} />
                        <Bar dataKey="count" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Weekly Volume Chart */}
            <div className="mb-10">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={cn("p-8", theme === 'dark' ? "glass-card border-slate-800/50" : "glass-card-light")}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-8 uppercase tracking-widest text-slate-500">
                    <ListTodo size={14} className="text-indigo-500" />
                    Weekly Application Volume
                  </h3>
                  <WeeklyVolumeChart jobs={jobs} theme={theme} />
                </div>
              </motion.div>
            </div>

            {/* Location, Pay Range, and Source Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
              {/* Location Distribution */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-4"
              >
                <div className={cn("p-8", theme === 'dark' ? "glass-card border-slate-800/50" : "glass-card-light")}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-8 uppercase tracking-widest text-slate-500">
                    <Briefcase size={14} className="text-indigo-500" />
                    Job Locations
                  </h3>
                  <LocationDistributionChart jobs={jobs} theme={theme} primaryColor={colors.primary} />
                </div>
              </motion.div>

              {/* Pay Range Distribution */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-4"
              >
                <div className={cn("p-8", theme === 'dark' ? "glass-card border-slate-800/50" : "glass-card-light")}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-8 uppercase tracking-widest text-slate-500">
                    <TrendingUp size={14} className="text-emerald-500" />
                    Pay Range Distribution
                  </h3>
                  <PayRangeDistributionChart jobs={jobs} theme={theme} primaryColor="#10b981" />
                </div>
              </motion.div>

              {/* Source Distribution */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-4"
              >
                <div className={cn("p-8", theme === 'dark' ? "glass-card border-slate-800/50" : "glass-card-light")}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-8 uppercase tracking-widest text-slate-500">
                    <Target size={14} className="text-rose-500" />
                    Application Sources
                  </h3>
                  <SourceDistributionChart jobs={jobs} theme={theme} />
                </div>
              </motion.div>
            </div>
          </>
        )}

        {/* Filters & Search */}
        <div className="mb-6 space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Query by company, role, or stack..." 
              className={cn(
                "w-full rounded-2xl pl-12 pr-4 py-3 text-sm outline-none transition-all border shadow-sm",
                theme === 'dark' 
                  ? "bg-[#18181b] border-slate-800 focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-600" 
                  : "bg-white border-slate-200 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-400"
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Desktop filter buttons for status */}
          <div className="hidden lg:flex flex-wrap items-center gap-1.5">
            {(['All', 'Applied', 'Interviewing', 'Technical', 'Offer', 'Rejected'] as const).map((stat) => (
              <button
                key={stat}
                onClick={() => setStatusFilter(stat)}
                className={cn(
                  "text-[10px] px-3 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all border whitespace-nowrap",
                  statusFilter === stat 
                    ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-500" 
                    : theme === 'dark' 
                      ? "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                {stat}
              </button>
            ))}
          </div>

          {/* Additional Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:hidden">
            {/* Status Filter - Mobile */}
            <div className="relative col-span-2 md:col-span-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider border outline-none appearance-none transition-all",
                  theme === 'dark'
                    ? "bg-[#18181b] border-slate-800 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                {(['All', 'Applied', 'Interviewing', 'Technical', 'Offer', 'Rejected'] as const).map((stat) => (
                  <option key={stat} value={stat}>{stat === 'All' ? 'Status' : stat}</option>
                ))}
              </select>
            </div>

            {/* Work Location Type Filter */}
            <div className="relative col-span-2 md:col-span-1">
              <select
                value={workLocationFilter}
                onChange={(e) => setWorkLocationFilter(e.target.value)}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider border outline-none appearance-none transition-all",
                  theme === 'dark'
                    ? "bg-[#18181b] border-slate-800 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                <option value="All">Work Type</option>
                {WORK_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="relative col-span-2 md:col-span-1">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider border outline-none appearance-none transition-all",
                  theme === 'dark'
                    ? "bg-[#18181b] border-slate-800 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                <option value="All">Location</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div className="relative col-span-2 md:col-span-1">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider border outline-none appearance-none transition-all",
                  theme === 'dark'
                    ? "bg-[#18181b] border-slate-800 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                <option value="All">Source</option>
                {availableSources.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Desktop Additional Filters */}
          <div className="hidden lg:grid grid-cols-3 gap-3">
            {/* Work Location Type Filter */}
            <div className="relative">
              <select
                value={workLocationFilter}
                onChange={(e) => setWorkLocationFilter(e.target.value)}
                className={cn(
                  "w-full rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border outline-none appearance-none transition-all",
                  theme === 'dark'
                    ? "bg-[#18181b] border-slate-800 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                <option value="All">All Work Types</option>
                {WORK_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-slate-400" size={14} />
            </div>

            {/* Location Filter */}
            <div className="relative">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className={cn(
                  "w-full rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border outline-none appearance-none transition-all",
                  theme === 'dark'
                    ? "bg-[#18181b] border-slate-800 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                <option value="All">All Locations</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-slate-400" size={14} />
            </div>

            {/* Source Filter */}
            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className={cn(
                  "w-full rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border outline-none appearance-none transition-all",
                  theme === 'dark'
                    ? "bg-[#18181b] border-slate-800 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                <option value="All">All Sources</option>
                {availableSources.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-slate-400" size={14} />
            </div>
          </div>
        </div>

        {/* Main Application List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full"
        >
          {/* Desktop Table View */}
          <div className={cn("hidden md:block overflow-hidden rounded-3xl", theme === 'dark' ? "glass-card border-slate-800/50" : "glass-card-light")}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={cn(
                    "text-[10px] uppercase tracking-[0.2em] font-bold border-b",
                    theme === 'dark' ? "bg-white/2 text-slate-500 border-slate-800/50" : "bg-slate-50/50 text-slate-400 border-slate-200"
                  )}>
                    <th className="px-8 py-5">Corporate entity</th>
                    <th className="px-8 py-5">current state</th>
                    <th className="px-8 py-5">Work Type & Pay</th>
                    <th className="px-8 py-5">Date Applied</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", theme === 'dark' ? "divide-slate-800/50" : "divide-slate-100")}>
                  <AnimatePresence mode="wait">
                    {paginatedJobs.length > 0 ? paginatedJobs.map((job) => {
                      const staleLevel = getStaleLevel(job.updatedAt);
                      return (
                        <motion.tr 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          key={job.id} 
                          onClick={() => openViewModal(job)}
                          className={cn(
                            "transition-all group cursor-pointer relative",
                            theme === 'dark' ? "hover:bg-indigo-500/3" : "hover:bg-indigo-50",
                            staleLevel === 'critical' && theme === 'dark' ? "shadow-[inset_4px_0_0_#ef4444]" : staleLevel === 'critical' ? "shadow-[inset_4px_0_0_#ef4444] bg-red-50/30" : "",
                            staleLevel === 'warning' && theme === 'dark' ? "shadow-[inset_4px_0_0_#f59e0b]" : staleLevel === 'warning' ? "shadow-[inset_4px_0_0_#f59e0b] bg-amber-50/30" : ""
                          )}
                        >
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className={cn("font-bold mb-0.5 group-hover:text-indigo-500 transition-colors uppercase tracking-tight", theme === 'dark' ? "text-slate-100" : "text-slate-900")}>
                                {job.company}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 leading-none">
                                {job.role}
                                {job.contacts.length > 0 && (
                                  <span className="flex items-center gap-0.5 text-indigo-400/70 border border-indigo-400/20 px-1 rounded">
                                    <User size={8} /> {job.contacts.length}
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap inline-flex items-center gap-1.5",
                              job.status === 'Offer' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              job.status === 'Rejected' && "bg-red-500/10 text-red-500 border-red-500/20",
                              job.status === 'Interviewing' && "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                              job.status === 'Technical' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                              job.status === 'Applied' && "bg-slate-500/10 text-slate-400 border-slate-500/20",
                              job.status === 'Ghosted' && "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                            )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full", {
                                'bg-emerald-500': job.status === 'Offer',
                                'bg-red-500': job.status === 'Rejected',
                                'bg-indigo-500': job.status === 'Interviewing',
                                'bg-amber-500': job.status === 'Technical',
                                'bg-slate-400': job.status === 'Applied',
                                'bg-zinc-500': job.status === 'Ghosted',
                              })} />
                              {job.status}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-1.5">
                              {job.workLocation && (
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-tight w-fit",
                                  theme === 'dark' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-600"
                                )}>
                                  {job.workLocation}
                                </span>
                              )}
                              {job.payRange && (
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-tight w-fit",
                                  theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                                )}>
                                  {job.payRange}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-2 font-bold">
                                {formatAppliedDate(job.appliedAt || job.date + 'T00:00:00')}
                                {staleLevel !== 'none' && (
                                  <div className={cn(
                                    "w-2 h-2 rounded-full animate-pulse",
                                    staleLevel === 'critical' ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                                  )} />
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openViewModal(job);
                                }}
                                className={cn(
                                  "p-2 rounded-lg transition-all",
                                  theme === 'dark' ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                                )}>
                                <Eye size={18} />
                              </button>
                              {job.link && job.link !== '#' && (
                                <a 
                                  href={job.link} 
                                  onClick={(e) => e.stopPropagation()}
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className={cn(
                                    "p-2 rounded-lg transition-all",
                                    theme === 'dark' ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                                  )}>
                                  <ExternalLink size={18} />
                                </a>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-6">
                            <Briefcase size={64} className="text-indigo-500 opacity-30" />
                            <div className="space-y-2">
                              {jobs.length === 0 ? (
                                <>
                                  <h3 className="text-xl font-bold tracking-tight">Your Career Pipeline is Empty</h3>
                                  <p className="text-sm text-slate-500 max-w-md">
                                    Start tracking your job applications by adding your first entry. All dashboard analytics and charts will automatically activate once you have applications recorded.
                                  </p>
                                </>
                              ) : (
                                <>
                                  <h3 className="text-xl font-bold tracking-tight">No Applications Found</h3>
                                  <p className="text-sm text-slate-500 max-w-md">
                                    No applications match the current filters. Try adjusting your status filter or search query.
                                  </p>
                                </>
                              )}
                            </div>
                            {jobs.length === 0 && (
                              <button 
                                onClick={openAddModal}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl flex items-center gap-2 transition-all text-sm font-bold shadow-lg shadow-indigo-600/20 active:scale-95 uppercase tracking-widest mt-4"
                              >
                                <Plus size={18} /> Add Your First Application
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Desktop Pagination Controls */}
            {filteredJobs.length > ITEMS_PER_PAGE && (
              <div className="px-8 py-6 border-t flex items-center justify-between" style={{
                borderColor: theme === 'dark' ? 'rgba(30, 30, 36, 0.5)' : 'rgba(226, 232, 240, 1)'
              }}>
                <div className={cn("text-sm font-medium", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                  Page <span className="font-bold">{validPage}</span> of <span className="font-bold">{totalPages}</span> • Showing <span className="font-bold">{paginatedJobs.length}</span> of <span className="font-bold">{filteredJobs.length}</span> jobs
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, validPage - 1))}
                    disabled={validPage === 1}
                    className={cn(
                      "px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all border",
                      validPage === 1
                        ? theme === 'dark'
                          ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        : theme === 'dark'
                          ? "bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
                          : "bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, validPage + 1))}
                    disabled={validPage === totalPages}
                    className={cn(
                      "px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all border",
                      validPage === totalPages
                        ? theme === 'dark'
                          ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        : theme === 'dark'
                          ? "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500"
                          : "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500"
                    )}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            <AnimatePresence mode="wait">
              {paginatedJobs.length > 0 ? paginatedJobs.map((job) => {
                const staleLevel = getStaleLevel(job.updatedAt);
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    key={job.id}
                    onClick={() => openViewModal(job)}
                    className={cn(
                      "p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
                      theme === 'dark' ? "bg-[#18181b] border-slate-800 hover:border-indigo-500/50" : "bg-white border-slate-200 hover:border-indigo-500/50 shadow-sm",
                      staleLevel === 'critical' && theme === 'dark' ? "shadow-[inset_4px_0_0_#ef4444]" : staleLevel === 'critical' ? "shadow-[inset_4px_0_0_#ef4444] bg-red-50/30" : "",
                      staleLevel === 'warning' && theme === 'dark' ? "shadow-[inset_4px_0_0_#f59e0b]" : staleLevel === 'warning' ? "shadow-[inset_4px_0_0_#f59e0b] bg-amber-50/30" : ""
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className={cn("font-bold text-lg leading-tight mb-1 uppercase tracking-tight", theme === 'dark' ? "text-slate-100" : "text-slate-900")}>
                          {job.company}
                        </h4>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                          {job.role}
                          {job.contacts.length > 0 && (
                            <span className="flex items-center gap-0.5 text-indigo-400/70 border border-indigo-400/20 px-1 rounded">
                              <User size={8} /> {job.contacts.length}
                            </span>
                          )}
                        </span>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap inline-flex items-center gap-1.5",
                        job.status === 'Offer' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                        job.status === 'Rejected' && "bg-red-500/10 text-red-500 border-red-500/20",
                        job.status === 'Interviewing' && "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                        job.status === 'Technical' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        job.status === 'Applied' && "bg-slate-500/10 text-slate-400 border-slate-500/20",
                        job.status === 'Ghosted' && "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", {
                          'bg-emerald-500': job.status === 'Offer',
                          'bg-red-500': job.status === 'Rejected',
                          'bg-indigo-500': job.status === 'Interviewing',
                          'bg-amber-500': job.status === 'Technical',
                          'bg-slate-400': job.status === 'Applied',
                          'bg-zinc-500': job.status === 'Ghosted',
                        })} />
                        {job.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {job.skills.slice(0, 4).map(skill => (
                        <span key={skill} className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-tight",
                          theme === 'dark' ? "bg-white/5 border-white/10 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                        )}>
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                          <span className="text-[9px] text-slate-500 font-bold self-center">+{job.skills.length - 4}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-500/10">
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-2 font-bold">
                        <Calendar size={12} />
                        {formatAppliedDate(job.appliedAt || job.date + 'T00:00:00')}
                        {staleLevel !== 'none' && (
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            staleLevel === 'critical' ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                          )} />
                        )}
                      </span>
                      
                      {job.link && job.link !== '#' && (
                        <a 
                          href={job.link} 
                          onClick={(e) => e.stopPropagation()}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            theme === 'dark' ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"
                          )}>
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="col-span-full py-16 text-center border-2 border-dashed rounded-3xl border-slate-500/20">
                  <div className="flex flex-col items-center gap-4">
                    <Briefcase size={48} className="text-indigo-500 opacity-30" />
                    <div className="space-y-1">
                      {jobs.length === 0 ? (
                        <>
                          <h3 className="text-lg font-bold tracking-tight">Your Career Pipeline is Empty</h3>
                          <p className="text-xs text-slate-500">Start tracking your job applications.</p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-bold tracking-tight">No Applications Found</h3>
                          <p className="text-xs text-slate-500">Try adjusting your filters.</p>
                        </>
                      )}
                    </div>
                    {jobs.length === 0 && (
                      <button 
                        onClick={openAddModal}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all text-xs font-bold shadow-lg shadow-indigo-600/20 active:scale-95 uppercase tracking-widest mt-2"
                      >
                        <Plus size={16} /> Add First Application
                      </button>
                    )}
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Mobile Pagination Controls */}
            {filteredJobs.length > ITEMS_PER_PAGE && (
              <div className="mt-6 flex flex-col gap-4 p-4 border-t" style={{
                borderColor: theme === 'dark' ? 'rgba(30, 30, 36, 0.5)' : 'rgba(226, 232, 240, 1)'
              }}>
                <div className={cn("text-sm font-medium text-center", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                  Page <span className="font-bold">{validPage}</span> of <span className="font-bold">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, validPage - 1))}
                    disabled={validPage === 1}
                    className={cn(
                      "px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all border flex-1",
                      validPage === 1
                        ? theme === 'dark'
                          ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        : theme === 'dark'
                          ? "bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
                          : "bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, validPage + 1))}
                    disabled={validPage === totalPages}
                    className={cn(
                      "px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all border flex-1",
                      validPage === totalPages
                        ? theme === 'dark'
                          ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        : theme === 'dark'
                          ? "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500"
                          : "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500"
                    )}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Command Palette (Ctrl+K) */}
      <AnimatePresence>
        {isCommandOpen && (
          <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] px-4 md:px-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsCommandOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className={cn(
                "w-full max-w-2xl relative rounded-3xl shadow-2xl overflow-hidden border",
                theme === 'dark' ? "bg-[#18181b] border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-center px-5 border-b border-slate-800/50">
                <Search className="text-slate-500 mr-3" size={20} />
                <input 
                  autoFocus
                  placeholder="Query system or search..."
                  className={cn(
                    "w-full bg-transparent border-none py-5 focus:ring-0 text-lg outline-none",
                    theme === 'dark' ? "text-white" : "text-slate-900"
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { 
                      if(e.key === 'Enter') setIsCommandOpen(false);
                  }}
                />
              </div>
              <div className="p-3 max-h-100 overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Application pipeline</div>
                <button 
                  onClick={openAddModal}
                  className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all", theme === 'dark' ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700")}
                >
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500"><Plus size={18} /></div>
                  <span className="font-bold text-sm">Initialize New Entry</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-500 opacity-50 px-2 rounded border border-slate-800">⌘ N</span>
                </button>
                <div className="px-3 py-2 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">System preferences</div>
                <button 
                  onClick={() => { toggleTheme(); setIsCommandOpen(false); }}
                  className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all", theme === 'dark' ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700")}
                >
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</div>
                  <span className="font-bold text-sm">Toggle Visual Theme</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-500 opacity-50 px-2 rounded border border-slate-800">⌘ T</span>
                </button>
              </div>
              <div className={cn("px-5 py-3 border-t flex items-center justify-between text-[10px] font-bold", theme === 'dark' ? "bg-black/20 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-400")}>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 uppercase tracking-widest"><kbd className="bg-slate-700/50 rounded px-1 min-w-5 text-center inline-block">↵</kbd> select</span>
                  <span className="flex items-center gap-1 uppercase tracking-widest"><kbd className="bg-slate-700/50 rounded px-1 min-w-5 text-center inline-block">↑↓</kbd> navigate</span>
                </div>
                <span className="uppercase tracking-[0.2em]">Career Hub v2.4</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Job Detail/Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-110 flex items-start justify-center overflow-y-auto px-4 py-8 md:py-16 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 pointer-events-auto"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "w-full max-w-4xl relative z-120 rounded-4xl shadow-2xl p-0 overflow-hidden pointer-events-auto border",
                theme === 'dark' ? "bg-[#09090b] border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="flex flex-col min-h-150">
                
                {/* Modal Sidebar */}
                <div className={cn(
                  "w-full px-10 py-6 border-b shrink-0",
                  theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50/50 border-slate-100"
                )}>
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
                          <Briefcase size={24} />
                        </div>
                        <div>
                          <h2 className={cn("text-xl font-bold tracking-tighter uppercase", theme === 'dark' ? "text-white" : "text-slate-900")}>
                              {jobForm.company || "CORPORATE"}
                          </h2>
                          <p className="text-indigo-500 font-bold text-xs uppercase tracking-widest">{jobForm.role || "POSITION"}</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      aria-label="Close modal"
                      className={cn(
                        "p-2.5 rounded-xl transition-all shrink-0",
                        theme === 'dark' ? "bg-white/5 border border-white/10 text-slate-500 hover:text-white" : "bg-slate-100 text-slate-400 hover:text-slate-900"
                      )}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {isEditMode && (
                    <>
                      <nav className="flex gap-1.5 mb-4">
                        <button 
                          onClick={() => setViewMode('default')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-[11px] font-bold uppercase tracking-widest",
                            viewMode === 'default' 
                              ? (theme === 'dark' ? "bg-white/10 text-white" : "bg-white shadow-sm text-indigo-600 border border-slate-200")
                              : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          <LayoutDashboard size={13} /> Application Details
                        </button>
                        <button 
                          onClick={() => setViewMode('interview')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-[11px] font-bold uppercase tracking-widest",
                            viewMode === 'interview' 
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5" 
                              : "text-slate-500 hover:text-amber-500/60"
                          )}
                        >
                          <AlertCircle size={13} /> Notes & Contacts
                        </button>
                      </nav>

                      {selectedJob && (
                        <div className={cn("flex gap-6 text-[9px] border-t pt-4", theme === 'dark' ? "border-slate-800" : "border-slate-200")}>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-500" />
                            <div>
                              <p className="text-slate-600 font-bold uppercase">Applied</p>
                              <p className={cn("font-bold font-mono text-[8px]", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>{selectedJob.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-500" />
                            <div>
                              <p className="text-slate-600 font-bold uppercase">Last Sync</p>
                              <p className={cn("font-bold font-mono text-[8px]", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>{formatTimeAgo(selectedJob.updatedAt)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-8 md:p-10 overflow-y-auto">
                  {!isEditMode && selectedJob ? (
                    <>
                      {/* Detail View Tabs */}
                      <nav className="flex gap-2 mb-8 border-b" style={{ borderColor: theme === 'dark' ? '#27272a' : '#e2e8f0' }}>
                        <button
                          onClick={() => setDetailViewTab('details')}
                          className={cn(
                            "px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all",
                            detailViewTab === 'details'
                              ? (theme === 'dark' ? "text-indigo-500 border-indigo-500" : "text-indigo-600 border-indigo-600")
                              : (theme === 'dark' ? "text-slate-500 border-transparent hover:text-slate-300" : "text-slate-500 border-transparent hover:text-slate-700")
                          )}
                        >
                          Details
                        </button>
                        <button
                          onClick={() => setDetailViewTab('contacts')}
                          className={cn(
                            "px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all",
                            detailViewTab === 'contacts'
                              ? (theme === 'dark' ? "text-indigo-500 border-indigo-500" : "text-indigo-600 border-indigo-600")
                              : (theme === 'dark' ? "text-slate-500 border-transparent hover:text-slate-300" : "text-slate-500 border-transparent hover:text-slate-700")
                          )}
                        >
                          Contacts
                        </button>
                        <button
                          onClick={() => setDetailViewTab('notes')}
                          className={cn(
                            "px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all",
                            detailViewTab === 'notes'
                              ? (theme === 'dark' ? "text-indigo-500 border-indigo-500" : "text-indigo-600 border-indigo-600")
                              : (theme === 'dark' ? "text-slate-500 border-transparent hover:text-slate-300" : "text-slate-500 border-transparent hover:text-slate-700")
                          )}
                        >
                          Notes
                        </button>
                      </nav>

                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        {/* Details Tab */}
                        {detailViewTab === 'details' && (
                          <div className="space-y-8">
                            {/* Company & Role */}
                            <div className="space-y-6">
                              <div>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Company</p>
                                <h2 className={cn("text-4xl font-bold mb-4", theme === 'dark' ? "text-white" : "text-slate-900")}>{selectedJob.company}</h2>
                              </div>
                              <div>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Position</p>
                                <h3 className={cn("text-2xl font-bold", theme === 'dark' ? "text-slate-100" : "text-slate-800")}>{selectedJob.role}</h3>
                              </div>
                            </div>

                            {/* Job Link */}
                            {selectedJob.link && selectedJob.link !== '#' && (
                              <a 
                                href={selectedJob.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "block p-5 rounded-2xl border transition-all hover:scale-105 group",
                                  theme === 'dark' ? "bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500/50" : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>Job Posting</p>
                                    <p className={cn("font-bold truncate group-hover:underline", theme === 'dark' ? "text-indigo-400" : "text-indigo-600")}>{selectedJob.link}</p>
                                  </div>
                                  <ExternalLink size={20} className={cn("shrink-0 ml-3 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1", theme === 'dark' ? "text-indigo-400" : "text-indigo-600")} />
                                </div>
                              </a>
                            )}

                            {/* Status & Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className={cn("p-5 rounded-2xl border", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Status</p>
                                <span className={cn("inline-block px-3 py-1.5 rounded-lg text-sm font-bold text-white", theme === 'dark' ? "bg-slate-700" : "bg-slate-600")} style={{ backgroundColor: STATUS_COLORS[selectedJob.status as JobStatus] }}>
                                  {selectedJob.status}
                                </span>
                              </div>
                              <div className={cn("p-5 rounded-2xl border", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Source</p>
                                <p className={cn("text-sm font-bold", theme === 'dark' ? "text-slate-200" : "text-slate-800")}>{selectedJob.source}</p>
                              </div>
                              {selectedJob.workLocation && (
                                <div className={cn("p-5 rounded-2xl border", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Work Location</p>
                                  <p className={cn("text-sm font-bold", theme === 'dark' ? "text-slate-200" : "text-slate-800")}>{selectedJob.workLocation}</p>
                                </div>
                              )}
                              {selectedJob.location && (
                                <div className={cn("p-5 rounded-2xl border", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Location</p>
                                  <p className={cn("text-sm font-bold", theme === 'dark' ? "text-slate-200" : "text-slate-800")}>{selectedJob.location}</p>
                                </div>
                              )}
                              {selectedJob.payRange && (
                                <div className={cn("p-5 rounded-2xl border", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Pay Range</p>
                                  <p className={cn("text-sm font-bold", theme === 'dark' ? "text-slate-200" : "text-slate-800")}>{selectedJob.payRange}</p>
                                </div>
                              )}
                            </div>

                            {/* Skills */}
                            {selectedJob.skills && selectedJob.skills.length > 0 && (
                              <div className={cn("p-5 rounded-2xl border", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Required Skills</p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedJob.skills.map(skill => (
                                    <span key={skill} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-tight">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Contacts Tab */}
                        {detailViewTab === 'contacts' && (
                          <div className="space-y-4">
                            {selectedJob.contacts && selectedJob.contacts.length > 0 ? (
                              <div className="space-y-3">
                                {selectedJob.contacts.map((contact, idx) => (
                                  <div key={idx} className={cn("p-5 rounded-2xl border", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                    <p className={cn("font-bold text-lg", theme === 'dark' ? "text-white" : "text-slate-900")}>{contact.name}</p>
                                    {contact.role && <p className={cn("text-xs font-bold uppercase tracking-wider mt-1", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>{contact.role}</p>}
                                    {contact.email && (
                                      <p className={cn("text-sm font-bold mt-2", theme === 'dark' ? "text-indigo-400" : "text-indigo-600")}>
                                        {contact.email}
                                      </p>
                                    )}
                                    {contact.linkedin && (
                                      <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className={cn("text-sm font-bold mt-1 hover:underline", theme === 'dark' ? "text-indigo-400" : "text-indigo-600")}>
                                        LinkedIn Profile
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={cn("p-8 rounded-2xl border text-center", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                <User size={32} className={cn("mx-auto mb-3", theme === 'dark' ? "text-slate-600" : "text-slate-400")} />
                                <p className={cn("text-sm font-bold", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>No contacts added yet</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes Tab */}
                        {detailViewTab === 'notes' && (
                          <div>
                            {selectedJob.notes ? (
                              <div className={cn("p-5 rounded-2xl border whitespace-pre-wrap", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                <p className={cn("text-sm leading-relaxed", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{selectedJob.notes}</p>
                              </div>
                            ) : (
                              <div className={cn("p-8 rounded-2xl border text-center", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50 border-slate-200")}>
                                <FileText size={32} className={cn("mx-auto mb-3", theme === 'dark' ? "text-slate-600" : "text-slate-400")} />
                                <p className={cn("text-sm font-bold", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>No notes added yet</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-8 border-t" style={{ borderColor: theme === 'dark' ? '#27272a' : '#e2e8f0' }}>
                          <button 
                            type="button"
                            onClick={() => setIsEditMode(true)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] uppercase tracking-[0.2em]"
                          >
                            <Edit2 size={18} /> Edit Job
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteJob(selectedJob.id)}
                            className="px-8 py-4 rounded-2xl border border-red-500/20 text-red-500 font-bold text-[10px] hover:bg-red-500/10 transition-all uppercase tracking-[0.2em]"
                          >
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      {viewMode === 'default' ? (
                        <form onSubmit={handleSubmit} className="space-y-8 w-full">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Company Name *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="e.g., Google, Meta, Startup Inc."
                            className={cn(
                                "input-base text-lg font-bold",
                                formErrors.company ? "ring-2 ring-red-500/50" : "",
                                theme === 'dark' ? "bg-zinc-900/50" : "bg-slate-50"
                            )}
                            value={jobForm.company || ''}
                            onChange={(e) => {
                              setJobForm({...jobForm, company: e.target.value});
                              if (formErrors.company) setFormErrors({...formErrors, company: ''});
                            }}
                          />
                          {formErrors.company && <p className="text-xs text-red-500 font-bold px-1">{formErrors.company}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Job Title / Position *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="e.g., Senior Frontend Engineer"
                            className={cn(
                                "input-base text-lg font-bold",
                                formErrors.role ? "ring-2 ring-red-500/50" : "",
                                theme === 'dark' ? "bg-zinc-900/50" : "bg-slate-50"
                            )}
                            value={jobForm.role || ''}
                            onChange={(e) => {
                              setJobForm({...jobForm, role: e.target.value});
                              if (formErrors.role) setFormErrors({...formErrors, role: ''});
                            }}
                          />
                          {formErrors.role && <p className="text-xs text-red-500 font-bold px-1">{formErrors.role}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Current Status</label>
                          <select 
                            className={cn(
                                "input-base font-bold",
                                theme === 'dark' ? "bg-zinc-900/50" : "bg-slate-50"
                            )}
                            value={jobForm.status}
                            onChange={(e) => setJobForm({...jobForm, status: e.target.value as JobStatus})}
                          >
                            {(['Applied', 'Interviewing', 'Technical', 'Offer', 'Rejected', 'Ghosted'] as JobStatus[]).map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2 relative">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Where You Found It</label>
                          <input 
                            type="text" 
                            className={cn(
                                "input-base font-bold",
                                theme === 'dark' ? "bg-zinc-900/50" : "bg-slate-50"
                            )}
                            value={sourceInput}
                            onFocus={() => setIsSourceDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsSourceDropdownOpen(false), 200)}
                            onChange={(e) => setSourceInput(e.target.value)}
                          />
                          {isSourceDropdownOpen && (
                            <div className={cn(
                                "absolute left-0 right-0 top-full mt-2 z-50 p-2 max-h-40 overflow-y-auto rounded-xl border shadow-2xl",
                                theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
                            )}>
                              {COMMON_SOURCES.filter(s => s.toLowerCase().includes(sourceInput.toLowerCase())).map(s => (
                                <button key={s} type="button" onMouseDown={() => setSourceInput(s)} className="w-full text-left px-3 py-2 text-[11px] font-bold uppercase rounded-lg hover:bg-indigo-500/10 hover:text-indigo-500 transition-all">
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Job Posting URL</label>
                          <input 
                             type="text"
                             placeholder="https://example.com/careers/job"
                             className={cn(
                                "input-base font-mono text-[10px]",
                                formErrors.link ? "ring-2 ring-red-500/50" : "",
                                theme === 'dark' ? "bg-zinc-900/50" : "bg-slate-50"
                             )}
                             value={jobForm.link || ''}
                             onChange={(e) => {
                               setJobForm({...jobForm, link: e.target.value});
                               if (formErrors.link) setFormErrors({...formErrors, link: ''});
                             }}
                          />
                          {formErrors.link && <p className="text-xs text-red-500 font-bold px-1">{formErrors.link}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Work Location (Optional)</label>
                          <select 
                            className={cn(
                                "input-base font-bold",
                                theme === 'dark' ? "bg-zinc-900/50" : "bg-slate-50"
                            )}
                            value={jobForm.workLocation || ''}
                            onChange={(e) => setJobForm({...jobForm, workLocation: e.target.value as any})}
                          >
                            <option value="">Select location type...</option>
                            {WORK_LOCATIONS.map(loc => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">City / Region (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="e.g., San Francisco, Remote"
                            className={cn(
                                "input-base font-bold",
                                theme === 'dark' ? "bg-zinc-900/50" : "bg-slate-50"
                            )}
                            value={jobForm.location || ''}
                            onChange={(e) => setJobForm({...jobForm, location: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Pay Range (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="e.g., 100k-120k"
                            className={cn(
                                "input-base font-bold",
                                theme === 'dark' ? "bg-zinc-900/50" : "bg-slate-50"
                            )}
                            value={jobForm.payRange || ''}
                            onChange={(e) => setJobForm({...jobForm, payRange: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Required Technologies & Skills</label>
                        <div className={cn(
                                "flex flex-wrap gap-2 p-2 rounded-2xl border min-h-15",
                                theme === 'dark' ? "bg-white/2 border-slate-800/50" : "bg-slate-50 border-slate-200"
                            )}>
                          {jobForm.skills?.map(skill => (
                            <span key={skill} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-tight">
                              {skill}
                              <X size={14} aria-label="Delete skill" className="cursor-pointer hover:text-white" onClick={() => setJobForm({...jobForm, skills: jobForm.skills?.filter(s => s !== skill)})} />
                            </span>
                          ))}
                          <div className="relative flex-1">
                            <input 
                              placeholder="React, TypeScript, AWS... (Press Enter)"
                              className="bg-transparent border-none focus:ring-0 text-sm font-bold w-full py-1 placeholder:text-slate-600 h-10 px-3"
                              value={skillInput}
                              onChange={(e) => setSkillInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (skillInput && !jobForm.skills?.includes(skillInput)) {
                                    setJobForm({...jobForm, skills: [...(jobForm.skills || []), skillInput]});
                                    setSkillInput("");
                                  }
                                }
                              }}
                            />
                            {skillInput && (
                                <div className={cn(
                                    "absolute left-0 top-full mt-2 z-50 p-2 max-h-32 overflow-y-auto rounded-xl border shadow-2xl",
                                    theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
                                )}>
                                    {COMMON_SKILLS.filter(s => s.toLowerCase().includes(skillInput.toLowerCase())).map(s => (
                                        <button key={s} type="button" onMouseDown={() => {
                                            setJobForm({...jobForm, skills: [...(jobForm.skills || []), s]});
                                            setSkillInput("");
                                        }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase rounded-lg hover:bg-white/5 transition-all">{s}</button>
                                    ))}
                                </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-10 border-t border-slate-800/50">
                        {selectedJob && (
                          <button 
                            type="button"
                            onClick={() => handleDeleteJob(selectedJob.id)}
                            className="px-8 py-4 rounded-2xl border border-red-500/20 text-red-500 font-bold text-[10px] hover:bg-red-500/10 transition-all uppercase tracking-[0.2em]"
                          >
                            Delete Entry
                          </button>
                        )}
                        <button 
                          type="submit"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] uppercase tracking-[0.2em]"
                        >
                          <Send size={18} /> Save Application
                        </button>
                      </div>
                    </form>
                  ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-10"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <section>
                          <div className="flex items-center gap-2 mb-6 uppercase tracking-widest text-[10px] font-bold text-slate-500">
                            <User size={14} className="text-indigo-400" />
                            Contacts & Recruiters
                          </div>
                          <div className={cn("rounded-3xl border p-4 space-y-3", theme === 'dark' ? "bg-white/2 border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                            {jobForm.contacts && jobForm.contacts.length > 0 ? jobForm.contacts.map((contact, i) => (
                              <div key={i} className={cn("flex items-start justify-between p-4 rounded-2xl border", theme === 'dark' ? "bg-black/20 border-slate-800" : "bg-white border-slate-200")}>
                                <div>
                                  <p className={cn("font-bold text-sm tracking-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>{contact.name}</p>
                                  {contact.email && <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">{contact.email}</p>}
                                  {contact.linkedin && <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">LinkedIn</p>}
                                  {!contact.email && !contact.linkedin && contact.role && <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">{contact.role}</p>}
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => handleOpenContactModal(i)}
                                    className="p-2 rounded-lg bg-indigo-500/5 text-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-500 transition-all" 
                                    aria-label="Edit contact"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteContact(i)}
                                    className="p-2 rounded-lg bg-red-500/5 text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                    aria-label="Delete contact"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            )) : (
                              <div className="py-8 text-center">
                                <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest italic leading-relaxed">No relational contacts mapped.<br/>Link recruiters or referrers.</p>
                              </div>
                            )}
                            <button 
                                type="button"
                                onClick={() => handleOpenContactModal()}
                                className={cn(
                                    "w-full py-3 border border-dashed rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                    theme === 'dark' ? "border-slate-800 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/5" : "border-slate-300 text-slate-400 hover:border-indigo-500 hover:text-indigo-500"
                                )}
                            >
                                + Add Contact
                            </button>
                          </div>
                        </section>

                        <section>
                          <div className="flex items-center gap-2 mb-6 uppercase tracking-widest text-[10px] font-bold text-slate-500">
                            <FileText size={14} className="text-indigo-400" />
                            Resume & Cover Letter
                          </div>
                          <div className="space-y-3">
                            <div className={cn("p-4 rounded-2xl border flex items-center justify-between transition-all hover:border-indigo-500/50", theme === 'dark' ? "bg-white/2 border-slate-8000" : "bg-white border-slate-200")}>
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2.5 rounded-xl", theme === 'dark' ? "bg-slate-800 text-indigo-400" : "bg-slate-50 text-indigo-600 shadow-sm")}><FileText size={16} /></div>
                                    <div>
                                        <p className={cn("text-[11px] font-bold uppercase tracking-widest", theme === 'dark' ? "text-slate-300" : "text-slate-900")}>Standard Resume v2.4</p>
                                        <p className="text-[9px] text-slate-500 font-bold mt-0.5 uppercase tracking-tighter">PDF • 1.2 MB</p>
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg hover:bg-indigo-500/10 text-slate-600 hover:text-indigo-500 transition-all cursor-pointer" aria-label="View document"><Eye size={16} /></div>
                            </div>
                            <div className={cn("p-4 rounded-2xl border border-dashed flex items-center justify-center opacity-40 hover:opacity-100 transition-all group", theme === 'dark' ? "border-slate-800" : "border-slate-300")}>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-500">
                                    <Plus size={14} /> Link cover letter
                                </div>
                            </div>
                          </div>
                        </section>
                      </div>

                      <section>
                        <div className="flex items-center gap-2 mb-4 uppercase tracking-widest text-[10px] font-bold text-slate-500">
                          <AlertCircle size={14} className="text-indigo-400" />
                          Interview Notes & Research
                        </div>
                        <div className="relative">
                            <textarea 
                            className={cn(
                                "w-full h-48 p-8 rounded-4xl border outline-none font-mono text-xs leading-relaxed transition-all",
                                theme === 'dark' ? "bg-white/1 border-slate-800 text-indigo-300/80 focus:border-indigo-500/50 shadow-inner" : "bg-slate-50/50 border-slate-200 text-slate-600 focus:border-indigo-500/30"
                            )}
                            placeholder="Interview questions to prepare for • Cultural fit notes • Company research insights • Salary expectations • Follow-up reminders..."
                            value={jobForm.notes || ''}
                            onChange={(e) => setJobForm({...jobForm, notes: e.target.value})}
                            />
                            <div className="absolute right-6 bottom-6 flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Autosaving intelligence</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                        </div>
                      </section>

                      <div className="flex gap-4 pt-10 border-t border-slate-800/50">
                        <button 
                          type="button"
                          onClick={() => {
                            if (selectedJob) {
                              setJobForm({
                                ...jobForm,
                                status: selectedJob.status,
                                date: selectedJob.date,
                                company: selectedJob.company,
                                role: selectedJob.role,
                                salary: selectedJob.salary,
                                link: selectedJob.link,
                                skills: selectedJob.skills,
                                contacts: jobForm.contacts,
                                notes: jobForm.notes,
                                resumeUrl: selectedJob.resumeUrl,
                                coverLetterUrl: selectedJob.coverLetterUrl,
                              });
                              const timestamp = new Date().toISOString().split('T')[0];
                              setJobs((prev: Job[]) => prev.map((j: Job) => j.id === selectedJob.id ? { 
                                ...j, 
                                ...jobForm, 
                                source: sourceInput || j.source,
                                updatedAt: timestamp 
                              } as Job : j));
                              setIsModalOpen(false);
                            }
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] uppercase tracking-[0.2em]"
                        >
                          <Send size={18} /> Save Notes & Contacts
                        </button>                     </div>

                    </motion.div>
                  )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Welcome Onboarding Modal */}
      <AnimatePresence>
        {showWelcome && (
          <div className="fixed inset-0 z-150 flex items-center justify-center px-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/40 pointer-events-auto"
              onClick={handleWelcomeDismiss}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "w-full max-w-2xl relative z-10 rounded-3xl shadow-2xl pointer-events-auto border flex flex-col max-h-[90vh]",
                theme === 'dark' ? "bg-[#09090b] border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Welcome Section */}
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-600 mx-auto flex items-center justify-center shadow-xl shadow-indigo-600/30">
                    <Target size={40} className="text-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tighter uppercase">Welcome to Career Pipeline</h2>
                    <p className={cn("text-sm max-w-sm mx-auto", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                      Track all your job applications in one place. Visualize your progress, identify bottlenecks, and land your next role faster.
                    </p>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className={cn("flex items-center gap-4 p-4 rounded-2xl text-left", theme === 'dark' ? "bg-white/5 border border-white/10" : "bg-slate-50 border border-slate-200")}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0", "bg-indigo-600")}>
                        <Briefcase size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Track Applications</p>
                        <p className={cn("text-xs", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>Log every opportunity with full details</p>
                      </div>
                    </div>
                    
                    <div className={cn("flex items-center gap-4 p-4 rounded-2xl text-left", theme === 'dark' ? "bg-white/5 border border-white/10" : "bg-slate-50 border border-slate-200")}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0", "bg-indigo-600")}>
                        <LayoutDashboard size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Analytics Dashboard</p>
                        <p className={cn("text-xs", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>See your conversion rates at a glance</p>
                      </div>
                    </div>
                    
                    <div className={cn("flex items-center gap-4 p-4 rounded-2xl text-left", theme === 'dark' ? "bg-white/5 border border-white/10" : "bg-slate-50 border border-slate-200")}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0", "bg-indigo-600")}>
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Follow Up Reminders</p>
                        <p className={cn("text-xs", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>Never miss an opportunity again</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Learn More Button & Q&A Section */}
              <div className="border-t" style={{ borderColor: theme === 'dark' ? '#27272a' : '#e2e8f0' }}>
                <div className="p-8 pb-4">
                  <button
                    onClick={() => setShowLearnMore(!showLearnMore)}
                    className={cn("w-full text-left p-4 rounded-2xl border transition-all", theme === 'dark' ? "bg-white/2 border-slate-800 hover:bg-white/5" : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className={cn("font-bold text-sm uppercase tracking-wider", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                          Learn More
                        </h3>
                        <p className={cn("text-xs mt-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                          Get answers to common questions about using the tracker
                        </p>
                      </div>
                      <ChevronRight size={18} className={cn("transition-transform shrink-0 mt-0.5", showLearnMore && "rotate-90")} />
                    </div>
                  </button>
                </div>
                
                {/* Q&A Scrollable Section */}
                {showLearnMore && (
                <div className="max-h-[35vh] overflow-y-auto px-8 space-y-3 pb-4">

                  {/* Q1 */}
                  <button
                    onClick={() => setExpandedQA({...expandedQA, 1: !expandedQA[1]})}
                    className={cn("w-full text-left p-4 rounded-2xl border transition-all", theme === 'dark' ? "bg-white/2 border-slate-800 hover:bg-white/5" : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50")}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-indigo-500">
                        <Briefcase size={16} /> Q1: How do I add a job application?
                      </h4>
                      <ChevronRight size={18} className={cn("transition-transform", expandedQA[1] && "rotate-90")} />
                    </div>
                    {expandedQA[1] && (
                      <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700 space-y-2">
                        <p className={cn("text-[11px]", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>Click <strong>"+ NEW ENTRY"</strong> in the top right corner to create a new application. Fill in:</p>
                        <ul className={cn("text-[11px] space-y-1.5 ml-4", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                          <li>✓ <strong>Company Name</strong> (required)</li>
                          <li>✓ <strong>Job Title / Position</strong> (required)</li>
                          <li>○ <strong>Current Status</strong> - Where you are in the process</li>
                          <li>○ <strong>Where You Found It</strong> - LinkedIn, Indeed, etc.</li>
                          <li>○ <strong>Job Posting URL</strong> - Link to the job listing (optional)</li>
                          <li>○ <strong>Required Technologies & Skills</strong> - Type and press Enter</li>
                        </ul>
                      </div>
                    )}
                  </button>

                  {/* Q2 */}
                  <button
                    onClick={() => setExpandedQA({...expandedQA, 2: !expandedQA[2]})}
                    className={cn("w-full text-left p-4 rounded-2xl border transition-all", theme === 'dark' ? "bg-white/2 border-slate-800 hover:bg-white/5" : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50")}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-amber-500">
                        <Tag size={16} /> Q2: What do the application statuses mean?
                      </h4>
                      <ChevronRight size={18} className={cn("transition-transform", expandedQA[2] && "rotate-90")} />
                    </div>
                    {expandedQA[2] && (
                      <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700 space-y-1.5 text-[11px]">
                        <div className="flex gap-2"><span className="font-bold text-slate-400 bg-slate-500/10 px-2 py-1 rounded text-[9px]">APPLIED</span><span className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>You submitted your application</span></div>
                        <div className="flex gap-2"><span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded text-[9px]">INTERVIEWING</span><span className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>First or ongoing interview rounds</span></div>
                        <div className="flex gap-2"><span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded text-[9px]">TECHNICAL</span><span className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>Technical assessment or coding challenge</span></div>
                        <div className="flex gap-2"><span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-[9px]">OFFER</span><span className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>Offer received 🎉</span></div>
                        <div className="flex gap-2"><span className="font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded text-[9px]">REJECTED</span><span className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>Application rejected</span></div>
                        <div className="flex gap-2"><span className="font-bold text-zinc-400 bg-zinc-500/10 px-2 py-1 rounded text-[9px]">GHOSTED</span><span className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>No response after 30+ days</span></div>
                      </div>
                    )}
                  </button>

                  {/* Q3 */}
                  <button
                    onClick={() => setExpandedQA({...expandedQA, 3: !expandedQA[3]})}
                    className={cn("w-full text-left p-4 rounded-2xl border transition-all", theme === 'dark' ? "bg-white/2 border-slate-800 hover:bg-white/5" : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50")}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-orange-500">
                        <AlertCircle size={16} /> Q3: Why is my application highlighted?
                      </h4>
                      <ChevronRight size={18} className={cn("transition-transform", expandedQA[3] && "rotate-90")} />
                    </div>
                    {expandedQA[3] && (
                      <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700 space-y-2 text-[11px]">
                        <p className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>This is a follow-up reminder based on time since last update:</p>
                        <div className={cn("flex items-center gap-3 p-2 rounded", theme === 'dark' ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200")}>
                          <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                          <div>
                            <p className="font-bold">7-14 days: Send follow-up email</p>
                            <p className={cn("text-[10px]", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>Time to check in with the recruiter</p>
                          </div>
                        </div>
                        <div className={cn("flex items-center gap-3 p-2 rounded", theme === 'dark' ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200")}>
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                          <div>
                            <p className="font-bold">14+ days: Urgent follow-up</p>
                            <p className={cn("text-[10px]", theme === 'dark' ? "text-slate-400" : "text-slate-600")}>Update your status to reset the timer!</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Q4 */}
                  <button
                    onClick={() => setExpandedQA({...expandedQA, 4: !expandedQA[4]})}
                    className={cn("w-full text-left p-4 rounded-2xl border transition-all", theme === 'dark' ? "bg-white/2 border-slate-800 hover:bg-white/5" : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50")}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-cyan-500">
                        <LayoutDashboard size={16} /> Q4: What do the dashboard charts show?
                      </h4>
                      <ChevronRight size={18} className={cn("transition-transform", expandedQA[4] && "rotate-90")} />
                    </div>
                    {expandedQA[4] && (
                      <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700 space-y-2 text-[11px]">
                        <div><p className="font-bold mb-1">📊 Status Breakdown (Donut Chart)</p><p className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>Shows how many applications in each status. Helps identify bottlenecks.</p></div>
                        <div><p className="font-bold mb-1">🔥 Technical Skill Heatmap (Bar Chart)</p><p className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>Most frequently required technologies. Focus your learning on these!</p></div>
                        <div><p className="font-bold mb-1">📈 Weekly Volume (Line Chart)</p><p className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>Application submissions over time. Aim for 3-5 per week.</p></div>
                      </div>
                    )}
                  </button>

                  {/* Q5 */}
                  <button
                    onClick={() => setExpandedQA({...expandedQA, 5: !expandedQA[5]})}
                    className={cn("w-full text-left p-4 rounded-2xl border transition-all", theme === 'dark' ? "bg-white/2 border-slate-800 hover:bg-white/5" : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50")}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-purple-500">
                        <User size={16} /> Q5: What goes in "Notes & Contacts"?
                      </h4>
                      <ChevronRight size={18} className={cn("transition-transform", expandedQA[5] && "rotate-90")} />
                    </div>
                    {expandedQA[5] && (
                      <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700 space-y-2 text-[11px]">
                        <div><p className="font-bold mb-0.5">👥 Contacts & Recruiters</p><p className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>Store recruiter/hiring manager name, email, and LinkedIn profile</p></div>
                        <div><p className="font-bold mb-0.5">📄 Resume & Cover Letter</p><p className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>Track which version of your materials you submitted</p></div>
                        <div><p className="font-bold mb-0.5">📝 Interview Notes & Research</p><p className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>Technical questions, company culture notes, salary expectations, follow-up reminders</p></div>
                      </div>
                    )}
                  </button>

                  {/* Q6 */}
                  <button
                    onClick={() => setExpandedQA({...expandedQA, 6: !expandedQA[6]})}
                    className={cn("w-full text-left p-4 rounded-2xl border transition-all", theme === 'dark' ? "bg-white/2 border-slate-800 hover:bg-white/5" : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50")}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-green-600">
                        <Target size={16} /> Q6: Pro tips for success?
                      </h4>
                      <ChevronRight size={18} className={cn("transition-transform", expandedQA[6] && "rotate-90")} />
                    </div>
                    {expandedQA[6] && (
                      <ul className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700 text-[11px] space-y-1.5 ml-4">
                        <li className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>💡 <strong>Update status immediately</strong> after each interview or rejection</li>
                        <li className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>💡 <strong>Aim for 3-5 applications per week</strong> for a healthy pipeline</li>
                        <li className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>💡 <strong>Use the search bar</strong> to find similar companies or roles</li>
                        <li className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>💡 <strong>Save all research notes</strong> before interviews</li>
                        <li className={theme === 'dark' ? "text-slate-400" : "text-slate-600"}>💡 <strong>Track salary details</strong> in Notes for negotiations</li>
                      </ul>
                    )}
                  </button>
                </div>
                )}
              </div>

              {/* Overlay Buttons - Always Visible */}
              <div className="p-8 pt-4 flex flex-col gap-3 border-t" style={{ borderColor: theme === 'dark' ? '#27272a' : '#e2e8f0' }}>
                <button 
                  onClick={handleWelcomeStart}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] uppercase tracking-[0.2em] text-[11px]"
                >
                  <Plus size={18} /> Add Your First Application
                </button>
                <button 
                  onClick={handleWelcomeDismiss}
                  className={cn(
                    "w-full py-3 rounded-xl text-sm font-bold uppercase tracking-[0.2em] transition-all",
                    theme === 'dark' ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900"
                  )}
                >
                  Explore First
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <ContactModal 
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setEditingContactIndex(null);
        }}
        onSave={handleSaveContact}
        initialContact={editingContactIndex !== null && jobForm.contacts ? jobForm.contacts[editingContactIndex] : undefined}
        theme={theme}
      />

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-160 flex items-center justify-center px-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 pointer-events-auto"
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "w-full max-w-md relative z-10 rounded-3xl shadow-2xl p-8 pointer-events-auto border",
                theme === 'dark' ? "bg-[#09090b] border-red-500/30" : "bg-white border-red-200"
              )}
            >
              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 mx-auto flex items-center justify-center border border-red-500/20">
                  <AlertCircle size={32} className="text-red-500" />
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-xl font-bold tracking-tighter uppercase">Reset Everything?</h2>
                  <p className="text-sm text-slate-500">
                    This will <span className="text-red-500 font-bold">PERMANENTLY DELETE</span> all your saved applications and reset the app completely. This action cannot be undone.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    onClick={confirmReset}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-[0.2em]"
                  >
                    Yes, Reset Everything
                  </button>
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className={cn(
                      "w-full py-3 rounded-xl text-sm font-bold uppercase tracking-[0.2em] transition-all",
                      theme === 'dark' ? "text-slate-500 hover:text-white" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Cancel, Keep My Data
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating New Entry Button */}
      <motion.button
        onClick={openAddModal}
        className={cn(
          "fixed bottom-8 right-8 p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 z-50 flex items-center justify-center gap-2",
          theme === 'dark' 
            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40" 
            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        title="Add new job application"
      >
        <Plus size={24} />
      </motion.button>
    </div>
  );
}
