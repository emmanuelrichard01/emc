import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowRight, Home, User, Briefcase, Mail, FileText,
  Github, Linkedin, Copy, ExternalLink, Sparkles, Palette, Download
} from "lucide-react";
import { toast } from "sonner";
import { XLogo } from "@/components/ui/XLogo";
import { useTheme } from "./ThemeProvider";
import { useEasterEgg } from "./EasterEggProvider";
import { scrollToSection as scrollToSectionBase } from "@/lib/scrollToSection";
import { SECTIONS } from "@/data/sections";
import { CV_FILE_NAME, CV_FILE_SIZE, downloadCV } from "@/lib/cv";

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

/* Palette-only copy for the shared sections. Kept as a lookup rather than
   pushed into SECTIONS itself, since the nav pill and footer have no use for
   a subtitle and shouldn't carry the field. */
const SECTION_SUBTITLES: Record<string, string> = {
  home: "Back to top",
  about: "Philosophy & stack",
  projects: "Case studies & systems",
  experience: "Career timeline",
  contact: "Get in touch",
};

const SECTION_KEYWORDS: Record<string, string[]> = {
  home: ["top", "start"],
  about: ["bio", "stack", "tech"],
  projects: ["work", "portfolio", "case"],
  experience: ["jobs", "resume", "cv"],
  contact: ["email", "hire", "reach"],
};

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const { theme, setTheme } = useTheme();
  const { unlock, unlocked } = useEasterEgg();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback(
    (id: string) => {
      if (scrollToSectionBase(id)) onClose();
    },
    [onClose]
  );

  const copyEmail = useCallback(() => {
    navigator.clipboard.writeText("emma.moghalu@gmail.com");
    toast.success("Email copied to clipboard", {
      description: "emma.moghalu@gmail.com",
    });
    onClose();
  }, [onClose]);

  const triggerCVDownload = useCallback(() => {
    onClose();
    // Small delay to let palette close, then trigger download
    setTimeout(downloadCV, 150);
  }, [onClose]);

  const commands: CommandItem[] = useMemo(
    () => [
      /* Navigation is generated from the shared SECTIONS list.
         These were five hand-written entries, which is exactly the drift
         sections.ts was created to prevent — it already claimed the palette
         read from it while the palette kept its own copy, and the two had
         already diverged ("Projects" here against "Work" in the nav). */
      ...SECTIONS.map((section) => ({
        id: `nav-${section.id}`,
        title: section.label,
        subtitle: SECTION_SUBTITLES[section.id] ?? `Go to ${section.label}`,
        icon: section.icon,
        action: () => scrollToSection(section.id),
        category: "Navigate",
        keywords: [section.id, section.label.toLowerCase(), ...(SECTION_KEYWORDS[section.id] ?? [])],
      })),
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
      {
        id: "download-cv",
        title: "Download CV",
        subtitle: `${CV_FILE_NAME} · ${CV_FILE_SIZE}`,
        icon: Download,
        action: triggerCVDownload,
        category: "Actions",
        keywords: ["download", "cv", "resume", "pdf", "curriculum"],
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
        subtitle: "x.com/mrebr",
        icon: XLogo,
        action: () => { window.open("https://x.com/mrebr", "_blank"); onClose(); },
        category: "Links",
        keywords: ["twitter", "x", "social"],
      },
      // Theme
      {
        id: "theme-amber",
        title: "Telemetry Amber",
        subtitle: "Switch to default monochrome & amber theme",
        icon: Palette,
        action: () => { setTheme("amber"); onClose(); },
        category: "Preferences",
        keywords: ["theme", "color", "amber", "orange", "dark"],
      },
      {
        id: "theme-purple",
        title: "Tech Purple",
        subtitle: "Switch to monochrome & purple theme",
        icon: Palette,
        action: () => { setTheme("purple"); onClose(); },
        category: "Preferences",
        keywords: ["theme", "color", "purple", "violet", "dark"],
      },
      // The hidden accent only becomes a real palette entry once clearance is
      // held — listing it while locked would give away that it exists.
      ...(unlocked
        ? [
            {
              id: "theme-phosphor",
              title: "Phosphor Green",
              subtitle: "Classified accent — Level Ω",
              icon: Palette,
              action: () => { setTheme("phosphor"); onClose(); },
              category: "Preferences",
              keywords: ["theme", "color", "phosphor", "green", "crt", "classified"],
            } satisfies CommandItem,
          ]
        : []),
      // Hidden — only appears when searching for it
      {
        id: "easter-egg",
        title: "???",
        subtitle: unlocked
          ? "Query layer already online. Run `schema` in the terminal."
          : "Secret payload detected. Enter the KONAMI sequence.",
        icon: Sparkles,
        action: () => {
          onClose();
          unlock();
        },
        category: "Hidden",
        keywords: ["secret", "konami", "easter", "hidden", "cheat"],
      },
    ],
    [scrollToSection, copyEmail, triggerCVDownload, onClose, setTheme, unlock, unlocked]
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
      if (!filtered.length && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
        return;
      }
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

  /* Clamp when the result set shrinks for a reason other than typing —
     unlocking adds an entry, relocking removes one. Resetting on `search`
     alone left the cursor pointing past the end, so Enter silently did
     nothing. */
  useEffect(() => {
    setSelectedIndex((i) => (i >= filtered.length ? Math.max(0, filtered.length - 1) : i));
  }, [filtered.length]);

  /* Restore focus to whatever opened the palette. Without this, closing it
     drops focus to <body> and a keyboard user restarts their tab traversal
     from the top of the document. */
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isOpen) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      setSearch("");
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    restoreFocusRef.current?.focus?.();
    restoreFocusRef.current = null;
  }, [isOpen]);
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

  // Focus trap
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const modal = modalRef.current;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  let flatIndex = -1;

  /* `isOpen` is gated inside AnimatePresence, not before it.
     This was `if (!isOpen) return null` above the boundary, which unmounts
     AnimatePresence itself at the same moment as its child — so it never
     observed a child leaving and every exit={} prop below was inert. */
  return (
    <AnimatePresence>
      {isOpen && (
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
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.98, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative w-full max-w-[520px] bg-card border border-border shadow-2xl rounded-none flex flex-col max-h-[60vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Search input */}
          <div className="flex items-center px-5 py-4 border-b border-border gap-3 bg-muted/30">
            <Search className="w-4 h-4 text-primary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search commands..."
              className="flex-1 bg-transparent border-none outline-none text-[13px] font-mono text-foreground placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd className="hidden sm:inline-flex px-2 py-0.5 text-[9px] font-mono text-muted-foreground border border-border uppercase tracking-widest">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="overflow-y-auto p-2 flex-1" role="listbox" aria-label="Command results">
            {filtered.length === 0 ? (
              <div className="py-12 text-center font-mono">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest">No results found.</p>
              </div>
            ) : (
              Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <div className="px-3 pt-2 pb-1 text-[9px] font-mono text-primary uppercase tracking-[0.2em]" role="presentation">
                    // {category}
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
                        className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors duration-0 group border-l-2 ${
                          selected ? "bg-muted/50 border-primary" : "border-transparent hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-1.5 border transition-colors ${
                              selected
                                ? "border-primary text-primary bg-primary/10"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            <cmd.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div
                              className={`text-[13px] font-mono tracking-wide uppercase transition-colors ${
                                selected ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {cmd.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                              {cmd.subtitle}
                            </div>
                          </div>
                        </div>
                        {selected && (
                          <div className="text-primary pr-2">
                            {cmd.category === "Links" ? (
                              <ExternalLink className="w-3.5 h-3.5" />
                            ) : cmd.id === "download-cv" ? (
                              <Download className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hints */}
          <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center gap-6 text-[9px] text-muted-foreground font-mono uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <kbd className="border border-border px-1.5 py-0.5">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-2">
              <kbd className="border border-border px-1.5 py-0.5">↵</kbd>
              select
            </span>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;