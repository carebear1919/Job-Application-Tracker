import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Linkedin } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Contact {
  name: string;
  email?: string;
  linkedin?: string;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Contact) => void;
  initialContact?: Contact;
  theme: 'dark' | 'light';
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateLinkedIn = (url: string): boolean => {
  if (!url) return true; // Optional field
  return url.includes('linkedin.com');
};

export const ContactModal: React.FC<ContactModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialContact, 
  theme 
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; linkedin?: string }>({});

  useEffect(() => {
    if (initialContact) {
      setName(initialContact.name);
      setEmail(initialContact.email || '');
      setLinkedin(initialContact.linkedin || '');
    } else {
      setName('');
      setEmail('');
      setLinkedin('');
    }
    setErrors({});
  }, [initialContact, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (email && !validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (linkedin && !validateLinkedIn(linkedin)) {
      newErrors.linkedin = 'Must include linkedin.com domain';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave({
      name: name.trim(),
      email: email.trim() || undefined,
      linkedin: linkedin.trim() || undefined,
    });

    setName('');
    setEmail('');
    setLinkedin('');
    setErrors({});
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setLinkedin('');
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-120 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'relative z-130 rounded-2xl shadow-2xl p-8 w-full max-w-md border',
              theme === 'dark'
                ? 'bg-[#09090b] border-slate-800'
                : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={cn('text-xl font-bold uppercase tracking-tight', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                {initialContact ? 'Edit Recruiter' : 'Add Recruiter'}
              </h2>
              <button
                onClick={handleClose}
                aria-label="Close contact form"
                className={cn(
                  'p-2 rounded-lg transition-all',
                  theme === 'dark'
                    ? 'bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-white/10'
                    : 'bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                )}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={cn('text-[10px] font-bold uppercase tracking-widest px-1 block mb-2', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Recruiter Name"
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border outline-none transition-all text-sm',
                    theme === 'dark'
                      ? 'bg-white/5 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500/50 focus:bg-white/10'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white',
                    errors.name && (theme === 'dark' ? 'border-red-500/50 bg-red-500/5' : 'border-red-300 bg-red-50')
                  )}
                />
                {errors.name && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.name}</p>
                )}
              </div>

              <div>
                <label className={cn('text-[10px] font-bold uppercase tracking-widest px-1 mb-2 flex items-center gap-1', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                  <Mail size={12} /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border outline-none transition-all text-sm',
                    theme === 'dark'
                      ? 'bg-white/5 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500/50 focus:bg-white/10'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white',
                    errors.email && (theme === 'dark' ? 'border-red-500/50 bg-red-500/5' : 'border-red-300 bg-red-50')
                  )}
                />
                {errors.email && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.email}</p>
                )}
              </div>

              <div>
                <label className={cn('text-[10px] font-bold uppercase tracking-widest px-1 mb-2 flex items-center gap-1', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                  <Linkedin size={12} /> LinkedIn URL
                </label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/recruiter"
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border outline-none transition-all text-sm',
                    theme === 'dark'
                      ? 'bg-white/5 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500/50 focus:bg-white/10'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white',
                    errors.linkedin && (theme === 'dark' ? 'border-red-500/50 bg-red-500/5' : 'border-red-300 bg-red-50')
                  )}
                />
                {errors.linkedin && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.linkedin}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all',
                    theme === 'dark'
                      ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300 border border-slate-800'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={cn(
                    'flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all text-white',
                    theme === 'dark'
                      ? 'bg-indigo-600 hover:bg-indigo-700 border border-indigo-600'
                      : 'bg-indigo-600 hover:bg-indigo-700 border border-indigo-600'
                  )}
                >
                  {initialContact ? 'Update' : 'Add'} Contact
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
