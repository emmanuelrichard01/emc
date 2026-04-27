import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowRight, Home, User, Briefcase, Mail, FileText,
  Github, Linkedin, Twitter, Copy, ExternalLink, Sparkles,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* TYPES & DATA                                                               */
/* -------------------------------------------------------------------------- */

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
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
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        onClose();
      }
    },
    [onClose]
  );

  const copyEmail = useCallback(() => {
    navigator.clipboard.writeText("emma.moghalu@gmail.com");
    onClose();
  }, [onClose]);

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "home",
        title: "Home",
        subtitle: "Back to top",
        icon: Home,
        action: () => scrollToSection("home"),
        category: "Navigate",
        keywords: ["home", "top", "start"],
      },
      {
        id: "about",
        title: "About",
        subtitle: "Philosophy & stack",
        icon: User,
        action: () => scrollToSection("about"),
        category: "Navigate",
        keywords: ["about", "bio", "stack", "tech"],
      },
      {
        id: "work",
        title: "Projects",
        subtitle: "Case studies & systems",
        icon: Briefcase,
        action: () => scrollToSection("projects"),
        category: "Navigate",
        keywords: ["work", "projects", "portfolio", "case"],
      },
      {
        id: "experience",
        title: "Experience",
        subtitle: "Career timeline",
        icon: FileText,
        action: () => scrollToSection("experience"),
        category: "Navigate",
        keywords: ["experience", "jobs", "resume", "cv"],
      },
      {
        id: "contact",
        title: "Contact",
        subtitle: "Get in touch",
        icon: Mail,
        action: () => scrollToSection("contact"),
        category: "Navigate",
        keywords: ["contact", "email", "hire", "reach"],
      },
      // Actions
      {
        id: "copy-email",
        title: "Copy Email",
        subtitle: "emma.moghalu@gmail.com",
        icon: Copy,
        action: copyEmail,
        category: "Actions",
        keywords: ["copy", "email", "clipboard"],
      },
      // Links
      {
        id: "github",
        title: "GitHub",
        subtitle: "github.com/emmanuelrichard01",
        icon: Github,
        action: () => { window.open("https://github.com/emmanuelrichard01", "_blank"); onClose(); },
        category: "Links",
        keywords: ["github", "code", "source"],
      },
      {
        id: "linkedin",
        title: "LinkedIn",
        subtitle: "linkedin.com/in/e-mc",
        icon: Linkedin,
        action: () => { window.open("https://www.linkedin.com/in/e-mc/", "_blank"); onClose(); },
        category: "Links",
        keywords: ["linkedin", "profile", "career"],
      },
      {
        id: "twitter",
        title: "X / Twitter",
        subtitle: "x.com/_mrebuka",
        icon: Twitter,
        action: () => { window.open("https://x.com/_mrebuka", "_blank"); onClose(); },
        category: "Links",
        keywords: ["twitter", "x", "social"],
      },
      // Hidden — only appears when searching for it
      {
        id: "easter-egg",
        title: "???",
        subtitle: "You found something. Try the Konami Code.",
        icon: Sparkles,
        action: () => {
          onClose();
          // Simulate Konami sequence via keyboard dispatch
          const keys = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
          keys.forEach((k, i) => setTimeout(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: k })), i * 30));
        },
        category: "Hidden",
        keywords: ["secret", "konami", "easter", "hidden", "cheat"],
      },
    ],
    [scrollToSection, copyEmail, onClose]
  );

  // Filter — hidden items only appear when their keywords match
  const filtered = useMemo(() => {
    if (!search) return commands.filter((c) => c.category !== "Hidden");
    const q = search.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q))
    );
  }, [search, commands]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((c) => {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    });
    return map;
  }, [filtered]);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[selectedIndex]?.action();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isOpen, filtered, selectedIndex, onClose]);

  useEffect(() => setSelectedIndex(0), [search]);
  useEffect(() => { if (isOpen) { setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); } }, [isOpen]);
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[520px] bg-[#0a0a0a] border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.7)] rounded-2xl overflow-hidden flex flex-col max-h-[60vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Top glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />

          {/* Search input */}
          <div className="flex items-center px-5 py-4 border-b border-white/[0.06] gap-3">
            <Search className="w-4 h-4 text-white/30 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-white/85 placeholder:text-white/40 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd className="hidden sm:inline-flex h-5 px-1.5 text-[9px] font-mono text-white/25 bg-white/[0.04] rounded border border-white/[0.06]">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="overflow-y-auto py-1.5 px-1.5 flex-1" role="listbox" aria-label="Command results">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-white/25">No results found.</p>
              </div>
            ) : (
              Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category} className="mb-1">
                  <div className="px-3 pt-2.5 pb-1.5 text-[9px] font-mono text-white/40 uppercase tracking-[0.2em]" role="presentation">
                    {category}
                  </div>
                  {items.map((cmd) => {
                    flatIndex++;
                    const idx = flatIndex;
                    const selected = selectedIndex === idx;
                    return (
                      <button
                        key={cmd.id}
                        data-index={idx}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        role="option"
                        aria-selected={selected}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 group ${
                          selected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-1.5 rounded-md transition-colors duration-150 ${
                              selected
                                ? "bg-primary/20 text-primary"
                                : "bg-white/[0.03] text-white/30"
                            }`}
                          >
                            <cmd.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div
                              className={`text-[13px] font-medium transition-colors duration-150 ${
                                selected ? "text-white" : "text-white/60"
                              }`}
                            >
                              {cmd.title}
                            </div>
                            <div className="text-[10px] text-white/45 mt-0.5">
                              {cmd.subtitle}
                            </div>
                          </div>
                        </div>
                        {selected && (
                          <motion.div
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.1 }}
                          >
                            {cmd.category === "Links" ? (
                              <ExternalLink className="w-3 h-3 text-white/30" />
                            ) : (
                              <ArrowRight className="w-3 h-3 text-white/30" />
                            )}
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hints */}
          <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center gap-5 text-[9px] text-white/40 font-mono tracking-wide">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-white/[0.04] border border-white/[0.06] rounded px-1 text-[10px] h-4 inline-flex items-center">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-white/[0.04] border border-white/[0.06] rounded px-1.5 text-[10px] h-4 inline-flex items-center">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-white/[0.04] border border-white/[0.06] rounded px-1.5 text-[10px] h-4 inline-flex items-center">esc</kbd>
              close
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;