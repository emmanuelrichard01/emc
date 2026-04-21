import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, Home, User, Briefcase, Mail, FileText,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* TYPES & DATA                                                               */
/* -------------------------------------------------------------------------- */

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  category: 'Navigation';
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      onClose();
    }
  }, [onClose]);

  const commands: CommandItem[] = useMemo(() => [
    {
      id: 'nav-home',
      title: 'Home',
      description: 'Return to the top',
      icon: Home,
      action: () => scrollToSection('home'),
      category: 'Navigation',
      keywords: ['home', 'top', 'start', 'hero'],
    },
    {
      id: 'nav-about',
      title: 'About',
      description: 'Philosophy & stack',
      icon: User,
      action: () => scrollToSection('about'),
      category: 'Navigation',
      keywords: ['about', 'bio', 'me', 'stack', 'tech'],
    },
    {
      id: 'nav-work',
      title: 'Work',
      description: 'Engineering case studies',
      icon: Briefcase,
      action: () => scrollToSection('projects'),
      category: 'Navigation',
      keywords: ['projects', 'work', 'case studies', 'portfolio'],
    },
    {
      id: 'nav-experience',
      title: 'Experience',
      description: 'Professional history',
      icon: FileText,
      action: () => scrollToSection('experience'),
      category: 'Navigation',
      keywords: ['jobs', 'history', 'cv', 'resume'],
    },
    {
      id: 'nav-contact',
      title: 'Contact',
      description: 'Get in touch',
      icon: Mail,
      action: () => scrollToSection('contact'),
      category: 'Navigation',
      keywords: ['email', 'reach', 'touch', 'hire'],
    },
  ], [scrollToSection]);

  // Filtering
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const q = search.toLowerCase();
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.includes(q)),
    );
  }, [search, commands]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filteredCommands[selectedIndex]?.action();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Reset selection on search change
  useEffect(() => setSelectedIndex(0), [search]);

  // Reset search on open
  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-[520px] bg-[#050505]/70 backdrop-blur-3xl border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden flex flex-col max-h-[55vh] ring-1 ring-white/[0.02]"
        >
          {/* Top glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />

          {/* Search */}
          <div className="relative flex items-center px-5 py-4 border-b border-white/[0.06] gap-3 bg-white/[0.01]">
            <Search className="w-4.5 h-4.5 text-white/40 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Where do you want to go?"
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-white/90 placeholder:text-white/25 tracking-wide font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 text-[9px] font-mono text-white/30 bg-white/[0.04] rounded border border-white/[0.06] tracking-widest">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="overflow-y-auto py-2 px-2 scrollbar-hide">
            {filteredCommands.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-white/30">No results found.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {filteredCommands.map((command, i) => {
                  const isSelected = selectedIndex === i;
                  return (
                    <button
                      key={command.id}
                      onClick={command.action}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                        isSelected
                          ? 'bg-white/[0.06]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`p-2 rounded-lg transition-colors duration-200 ${
                            isSelected
                              ? 'bg-primary/20 text-primary'
                              : 'bg-white/[0.03] text-white/35'
                          }`}
                        >
                          <command.icon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div
                            className={`text-[13px] font-medium tracking-wide transition-colors duration-200 ${
                              isSelected ? 'text-white' : 'text-white/65'
                            }`}
                          >
                            {command.title}
                          </div>
                          <div className="text-[11px] text-white/30 mt-0.5 tracking-wide">
                            {command.description}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="pr-1 text-white/40"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 bg-white/[0.01] border-t border-white/[0.05] flex items-center gap-4 text-[9px] text-white/25 font-mono tracking-widest uppercase">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-white/[0.04] border border-white/[0.06] rounded px-1 text-white/40 tracking-normal font-sans text-[10px] flex items-center h-4">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-white/[0.04] border border-white/[0.06] rounded px-1.5 text-white/40 tracking-normal font-sans text-[10px] flex items-center h-4">↵</kbd>
              select
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;