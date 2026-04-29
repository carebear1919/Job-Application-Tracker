import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ThemeCustomizer } from './ThemeCustomizer';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportData';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  colors: any;
  onColorChange: (key: string, value: string) => void;
  onResetTheme: () => void;
  jobs: any[];
  kpis: any;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  theme,
  colors,
  onColorChange,
  onResetTheme,
  jobs,
  kpis,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'theme' | 'export'>('theme');
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleCSVExport = async () => {
    setExporting('csv');
    try {
      exportToCSV(jobs);
    } catch (e) {
      console.error(e);
    }
    setExporting(null);
  };

  const handleExcelExport = async () => {
    setExporting('excel');
    try {
      await exportToExcel(jobs, kpis);
    } catch (e) {
      console.error(e);
    }
    setExporting(null);
  };

  const handlePDFExport = async () => {
    setExporting('pdf');
    try {
      await exportToPDF(jobs, kpis);
    } catch (e) {
      console.error(e);
    }
    setExporting(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute top-16 right-0 w-96 shadow-2xl rounded-2xl border z-50",
            theme === 'dark'
              ? "bg-[#09090b] border-slate-800"
              : "bg-white border-slate-200 shadow-lg"
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-6 py-4 border-b",
            theme === 'dark' ? "border-slate-800" : "border-slate-200"
          )}>
            <h2 className={cn(
              "text-lg font-bold",
              theme === 'dark' ? "text-white" : "text-slate-900"
            )}>
              Settings
            </h2>
            <button
              onClick={onClose}
              className={cn(
                "p-1.5 rounded-lg transition-all hover:scale-110",
                theme === 'dark'
                  ? "hover:bg-slate-800 text-slate-400"
                  : "hover:bg-slate-100 text-slate-500"
              )}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className={cn(
            "flex gap-0 border-b",
            theme === 'dark' ? "border-slate-800" : "border-slate-200"
          )}>
            <button
              onClick={() => setActiveTab('theme')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'theme'
                  ? "text-indigo-500 border-indigo-500"
                  : theme === 'dark'
                    ? "text-slate-500 border-transparent hover:text-slate-300"
                    : "text-slate-500 border-transparent hover:text-slate-700"
              )}
            >
              Theme
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'export'
                  ? "text-indigo-500 border-indigo-500"
                  : theme === 'dark'
                    ? "text-slate-500 border-transparent hover:text-slate-300"
                    : "text-slate-500 border-transparent hover:text-slate-700"
              )}
            >
              Export
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'theme' && (
              <ThemeCustomizer
                colors={colors}
                onColorChange={onColorChange}
                onReset={onResetTheme}
                theme={theme}
              />
            )}

            {activeTab === 'export' && (
              <div className="space-y-4">
                <div>
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-widest mb-4",
                    theme === 'dark' ? "text-slate-400" : "text-slate-500"
                  )}>
                    Download your data
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={handleCSVExport}
                      disabled={exporting === 'csv'}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-all",
                        exporting === 'csv'
                          ? "opacity-50 cursor-not-allowed"
                          : theme === 'dark'
                            ? "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                            : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <Download size={16} />
                      {exporting === 'csv' ? 'Exporting...' : 'Export as CSV'}
                    </button>

                    <button
                      onClick={handleExcelExport}
                      disabled={exporting === 'excel'}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-all",
                        exporting === 'excel'
                          ? "opacity-50 cursor-not-allowed"
                          : theme === 'dark'
                            ? "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                            : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <Download size={16} />
                      {exporting === 'excel' ? 'Exporting...' : 'Export as Excel'}
                    </button>

                    <button
                      onClick={handlePDFExport}
                      disabled={exporting === 'pdf'}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-all",
                        exporting === 'pdf'
                          ? "opacity-50 cursor-not-allowed"
                          : theme === 'dark'
                            ? "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                            : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <Download size={16} />
                      {exporting === 'pdf' ? 'Exporting...' : 'Export as PDF'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
