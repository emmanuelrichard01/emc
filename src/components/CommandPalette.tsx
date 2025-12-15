import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, Home, User, Briefcase, Mail,
  FileText, Palette, Moon, Sun, Monitor, Terminal,
  Layers, Zap, Cpu
} from 'lucide-react';
import { useTheme } from './ThemeProvider'; // Updated import

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
  const { setTheme } = useTheme();

  // Scroll Helper
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      onClose();
    }
  };

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
    // Theme
    {
      id: 'theme-light',
      title: 'Light Mode',
      description: 'Switch to light appearance',
      icon: Sun,
      action: () => { setTheme('light'); onClose(); },
      category: 'Theme',
      keywords: ['light', 'day', 'white']
    },
    {
      id: 'theme-dark',
      title: 'Dark Mode',
      description: 'Switch to dark appearance',
      icon: Moon,
      action: () => { setTheme('dark'); onClose(); },
      category: 'Theme',
      keywords: ['dark', 'night', 'black']
    },
    {
      id: 'theme-system',
      title: 'System Mode',
      description: 'Match OS preference',
      icon: Monitor,
      action: () => { setTheme('system'); onClose(); },
      category: 'Theme',
      keywords: ['auto', 'system', 'os']
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
  ], [setTheme]);

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
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-2xl bg-background/90 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]"
        >
          {/* Header / Search */}
          <div className="flex items-center px-4 py-4 border-b border-border/50 gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-muted-foreground/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-1">
              <kbd className="hidden sm:inline-flex items-center h-6 px-2 text-[10px] font-mono font-medium text-muted-foreground bg-muted rounded border border-border">
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
                {['Navigation', 'System', 'Theme'].map(category => {
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
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all duration-200 group ${isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-muted/50'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-md ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                                <command.icon className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <div className={`text-sm font-medium ${isSelected ? 'text-foreground' : ''}`}>
                                  {command.title}
                                </div>
                                <div className="text-xs opacity-70">
                                  {command.description}
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <motion.div
                                layoutId="cmd-arrow"
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="pr-2"
                              >
                                <ArrowRight className="w-4 h-4" />
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
          <div className="px-4 py-3 bg-muted/20 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <kbd className="bg-background border border-border rounded px-1">↑↓</kbd> to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-background border border-border rounded px-1">↵</kbd> to select
              </span>
            </div>
            <span>System v2.0</span>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;