import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Home, User, Briefcase, Mail, FileText, Palette, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { theme, setTheme } = useTheme();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      onClose();
    }
  };

  const commands: Command[] = [
    {
      id: 'nav-home',
      title: 'Go to Home',
      description: 'Navigate to the home section',
      icon: <Home className="h-4 w-4" />,
      action: () => scrollToSection('home'),
      category: 'Navigation',
      keywords: ['home', 'top', 'hero']
    },
    {
      id: 'nav-about',
      title: 'Go to About',
      description: 'Learn more about me',
      icon: <User className="h-4 w-4" />,
      action: () => scrollToSection('about'),
      category: 'Navigation',
      keywords: ['about', 'bio', 'skills', 'me']
    },
    {
      id: 'nav-projects',
      title: 'View Projects',
      description: 'See my work and portfolio',
      icon: <Briefcase className="h-4 w-4" />,
      action: () => scrollToSection('projects'),
      category: 'Navigation',
      keywords: ['projects', 'work', 'portfolio', 'showcase']
    },
    {
      id: 'nav-experience',
      title: 'View Experience',
      description: 'Professional background and career',
      icon: <FileText className="h-4 w-4" />,
      action: () => scrollToSection('experience'),
      category: 'Navigation',
      keywords: ['experience', 'career', 'jobs', 'history']
    },
    {
      id: 'nav-tech-radar',
      title: 'Tech Stack Radar',
      description: 'Interactive technology visualization',
      icon: <Palette className="h-4 w-4" />,
      action: () => scrollToSection('tech-radar'),
      category: 'Navigation',
      keywords: ['tech', 'stack', 'radar', 'technologies', 'skills']
    },
    {
      id: 'nav-blog',
      title: 'Read Blog',
      description: 'Technical articles and writings',
      icon: <FileText className="h-4 w-4" />,
      action: () => scrollToSection('blog'),
      category: 'Navigation',
      keywords: ['blog', 'articles', 'writings', 'technical']
    },
    {
      id: 'nav-contact',
      title: 'Contact Me',
      description: 'Get in touch',
      icon: <Mail className="h-4 w-4" />,
      action: () => scrollToSection('contact'),
      category: 'Navigation',
      keywords: ['contact', 'email', 'reach', 'touch']
    },
    {
      id: 'theme-light',
      title: 'Light Theme',
      description: 'Switch to light mode',
      icon: <Sun className="h-4 w-4" />,
      action: () => { setTheme('light'); onClose(); },
      category: 'Theme',
      keywords: ['light', 'theme', 'bright', 'white']
    },
    {
      id: 'theme-dark',
      title: 'Dark Theme',
      description: 'Switch to dark mode',
      icon: <Moon className="h-4 w-4" />,
      action: () => { setTheme('dark'); onClose(); },
      category: 'Theme',
      keywords: ['dark', 'theme', 'night', 'black']
    },
    {
      id: 'theme-system',
      title: 'System Theme',
      description: 'Use system preference',
      icon: <Monitor className="h-4 w-4" />,
      action: () => { setTheme('system'); onClose(); },
      category: 'Theme',
      keywords: ['system', 'auto', 'preference', 'default']
    }
  ];

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(search.toLowerCase()) ||
    command.description.toLowerCase().includes(search.toLowerCase()) ||
    command.keywords.some(keyword => keyword.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-start justify-center pt-[20vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[60vh] overflow-hidden"
        >
          {/* Search Input */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Type a command or search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
                autoFocus
              />
              <div className="text-xs text-muted-foreground">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">ESC</kbd>
              </div>
            </div>
          </div>

          {/* Commands List */}
          <div className="overflow-y-auto max-h-96">
            {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  {category}
                </div>
                {categoryCommands.map((command, categoryIndex) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  return (
                    <motion.button
                      key={command.id}
                      onClick={command.action}
                      className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-muted/50 transition-colors text-left ${
                        selectedIndex === globalIndex ? 'bg-muted/50' : ''
                      }`}
                      whileHover={{ x: 4 }}
                    >
                      <div className="text-muted-foreground">
                        {command.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          {command.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {command.description}
                        </div>
                      </div>
                      {selectedIndex === globalIndex && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
            
            {filteredCommands.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No commands found</p>
                <p className="text-sm">Try searching for something else</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-1 bg-background border rounded text-xs">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-1 bg-background border rounded text-xs">↵</kbd>
                <span>Select</span>
              </div>
            </div>
            <div>
              Press <kbd className="px-1.5 py-1 bg-background border rounded text-xs">Ctrl</kbd> + 
              <kbd className="px-1.5 py-1 bg-background border rounded text-xs">K</kbd> to open
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;