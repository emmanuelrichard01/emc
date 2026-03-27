import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, Home, User, Briefcase, Mail,
  FileText, Terminal, Layers
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 1. TYPES & DATA                                                            */
/* -------------------------------------------------------------------------- */

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  category: 'Navigation' | 'Theme' | 'System';
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/* 2. COMPONENT LOGIC                                                         */
/* -------------------------------------------------------------------------- */

const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Scroll Helper
  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      onClose();
    }
  }, [onClose]);

  // Command Definitions
  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-home',
      title: 'Home',
      description: 'Return to the start',
      icon: Home,
      action: () => scrollToSection('home'),
      category: 'Navigation',
      keywords: ['home', 'top', 'start', 'hero']
    },
    {
      id: 'nav-work',
      title: 'Work',
      description: 'View engineering case studies',
      icon: Briefcase,
      action: () => scrollToSection('projects'),
      category: 'Navigation',
      keywords: ['projects', 'work', 'case studies', 'portfolio']
    },
    {
      id: 'nav-about',
      title: 'About',
      description: 'Philosophy & Stack',
      icon: User,
      action: () => scrollToSection('about'),
      category: 'Navigation',
      keywords: ['about', 'bio', 'me', 'stack']
    },
    {
      id: 'nav-experience',
      title: 'Experience',
      description: 'Professional history log',
      icon: FileText,
      action: () => scrollToSection('experience'),
      category: 'Navigation',
      keywords: ['jobs', 'history', 'cv', 'resume']
    },
    {
      id: 'nav-contact',
      title: 'Contact',
      description: 'Initiate handshake',
      icon: Mail,
      action: () => scrollToSection('contact'),
      category: 'Navigation',
      keywords: ['email', 'reach', 'touch', 'hire']
    },
    {
      id: 'theme-system',
      title: 'Console Output',
      description: 'Toggle developer logs (Coming Soon)',
      icon: Terminal,
      action: () => { onClose(); },
      category: 'System',
      keywords: ['logs', 'console', 'debug']
    },

    // System Actions (Future Proofing)
    {
      id: 'sys-stack',
      title: 'View Tech Stack',
      description: 'Analyze dependencies',
      icon: Layers,
      action: () => scrollToSection('about'),
      category: 'System',
      keywords: ['tech', 'stack', 'tools']
    }
  ], [onClose, scrollToSection]);

  // Filtering Logic
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const lowerSearch = search.toLowerCase();
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(lowerSearch) ||
      cmd.description.toLowerCase().includes(lowerSearch) ||
      cmd.keywords.some(k => k.includes(lowerSearch))
    );
  }, [search, commands]);

  // Keyboard Navigation
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
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Reset selection on search change
  useEffect(() => setSelectedIndex(0), [search]);

  // Prevent background scroll
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
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-[600px] bg-[#050505]/70 backdrop-blur-3xl border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden flex flex-col max-h-[60vh] ring-1 ring-white/[0.02]"
        >
          {/* Subtle Inner Line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />
          
          {/* Header / Search */}
          <div className="relative flex items-center px-5 py-4 border-b border-white/[0.06] gap-3 bg-white/[0.01]">
            <Search className="w-5 h-5 text-white/40" />
            <input
              autoFocus
              type="text"
              placeholder="Search sections or type a command..."
              className="flex-1 bg-transparent border-none outline-none text-base text-white/90 placeholder:text-white/30 tracking-wide font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-1">
              <kbd className="hidden sm:inline-flex items-center h-6 px-1.5 text-[10px] font-mono font-medium text-white/30 bg-white/[0.05] rounded border border-white/10 tracking-widest">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto p-2 scrollbar-hide">
            {filteredCommands.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-sm">No commands found.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {/* Group by category if no search, else flat list */}
                {['Navigation', 'System'].map(category => {
                  const categoryCommands = filteredCommands.filter(c => c.category === category);
                  if (categoryCommands.length === 0) return null;

                  return (
                    <div key={category} className="mb-2">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-50">
                        {category}
                      </div>
                      {categoryCommands.map(command => {
                        // Calculate global index for keyboard nav
                        const globalIndex = filteredCommands.findIndex(c => c.id === command.id);
                        const isSelected = selectedIndex === globalIndex;

                        return (
                          <button
                            key={command.id}
                            onClick={command.action}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 group ${isSelected
                              ? 'bg-white/[0.06] border border-white/[0.04]'
                              : 'border border-transparent hover:bg-white/[0.02]'
                              }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2.5 rounded-lg transition-colors duration-300 ${isSelected ? 'bg-primary/20 text-primary' : 'bg-white/[0.03] text-white/40 group-hover:bg-white/[0.06] group-hover:text-white/60'}`}>
                                <command.icon className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <div className={`text-[13px] tracking-wide transition-colors duration-300 ${isSelected ? 'text-white font-medium' : 'text-white/70 font-medium group-hover:text-white/90'}`}>
                                  {command.title}
                                </div>
                                <div className="text-[11px] text-white/40 mt-0.5 tracking-wide">
                                  {command.description}
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <motion.div
                                layoutId="cmd-arrow"
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="pr-3 text-white/60"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </motion.div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Hints */}
          <div className="px-5 py-3 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/30 font-mono tracking-widest uppercase">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="bg-white/5 border border-white/10 rounded px-1 text-white/50 tracking-normal font-sans text-xs flex items-center h-4">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="bg-white/5 border border-white/10 rounded px-1.5 text-white/50 tracking-normal font-sans text-xs flex items-center h-4">↵</kbd> select
              </span>
            </div>
            <span className="opacity-50">SYSTEM_v2</span>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;