import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Grid3x3, LayoutGrid, List, Search, X } from 'lucide-react';

import { TIER_LABEL } from './tiers';
import { SORTS, TIERS, type SortKey, type Tier, type WorkState, type WorkView } from './workModel';

/* ==========================================================================
   WORK TOOLBAR

   One line of controls where there were three rows of chips.

   The old controls were a view toggle, five tier chips, ten technology
   chips and a "+ 23 more" — twenty-odd bordered boxes above the thing they
   controlled, so the first impression of the section was a form. Now:

     search   · across everything the case studies say, not just names
     tier     · a segmented control, the indicator sliding between options
     stack    · one button; the full list, with counts, in a popover
     sort     · tier, newest, or how much the write-up documents
     view     · index, cards, or the stack matrix

   Active filters surface once, as removable tokens under the bar, so what
   is narrowing the list is always visible and one click from undone.
   ========================================================================== */

const VIEW_ICONS: Record<WorkView, typeof List> = { index: List, cards: LayoutGrid, matrix: Grid3x3 };

interface WorkToolbarProps {
  state: WorkState;
  onChange: (patch: Partial<WorkState>) => void;
  tierCounts: Record<Tier, number>;
  stack: { name: string; count: number }[];
  total: number;
  shown: number;
}

/* ── Segmented control ───────────────────────────────────────────────── */

function Segmented<T extends string>({
  id,
  label,
  options,
  value,
  onSelect,
}: {
  id: string;
  label: string;
  options: { value: T; label: React.ReactNode; title?: string; count?: number }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex border border-border bg-background/40" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => onSelect(option.value)}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest whitespace-nowrap transition-colors ${
              selected ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {selected && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 bg-primary/10 border-b border-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                aria-hidden="true"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.label}
              {option.count !== undefined && (
                <span className={`tabular-nums ${selected ? 'text-primary/70' : 'text-muted-foreground/80'}`}>
                  {option.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Stack popover ───────────────────────────────────────────────────── */

function StackPicker({
  stack,
  selected,
  onToggle,
  onClear,
}: {
  stack: { name: string; count: number }[];
  selected: string[];
  onToggle: (name: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = filter.trim()
    ? stack.filter((t) => t.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : stack;
  const max = stack[0]?.count ?? 1;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
          selected.length || open
            ? 'border-primary/60 text-primary bg-primary/5'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
        }`}
      >
        stack
        {selected.length > 0 && <span className="tabular-nums">· {selected.length}</span>}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Filter by technology"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-40 left-0 top-[calc(100%+6px)] w-[min(320px,calc(100vw-3rem))] bg-card border border-border shadow-2xl origin-top-left"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="find a technology…"
                aria-label="Find a technology"
                className="flex-1 min-w-0 bg-transparent font-mono text-base md:text-[12px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                  clear
                </button>
              )}
            </div>
            <ul className="max-h-72 overflow-y-auto overscroll-contain py-1" aria-label="Technologies">
              {visible.map((tech) => {
                const on = selected.includes(tech.name);
                return (
                  <li key={tech.name}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => onToggle(tech.name)}
                      className="group w-full flex items-center gap-3 px-3 py-1.5 text-left hover:bg-foreground/[0.03] transition-colors"
                    >
                      <span
                        className={`w-3.5 h-3.5 shrink-0 flex items-center justify-center border transition-colors ${
                          on ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/50 group-hover:border-foreground'
                        }`}
                        aria-hidden="true"
                      >
                        {on && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                      </span>
                      <span className={`flex-1 font-mono text-[12px] truncate ${on ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        {tech.name}
                      </span>
                      {/* Usage as a bar as well as a number: the shape of the
                          list — a few heavy hitters, a long tail — reads at a
                          glance. */}
                      <span className="w-12 h-[3px] bg-border shrink-0" aria-hidden="true">
                        <span className="block h-full bg-primary/60" style={{ width: `${(tech.count / max) * 100}%` }} />
                      </span>
                      <span className="w-4 text-right font-mono text-[10px] text-muted-foreground tabular-nums">{tech.count}</span>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && (
                <li className="px-3 py-4 font-mono text-[11px] text-muted-foreground">nothing by that name</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Toolbar ─────────────────────────────────────────────────────────── */

export default function WorkToolbar({ state, onChange, tierCounts, stack, total, shown }: WorkToolbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const tokens: { key: string; label: string; clear: () => void }[] = [
    ...(state.query.trim() ? [{ key: 'q', label: `“${state.query.trim()}”`, clear: () => onChange({ query: '' }) }] : []),
    ...(state.tier ? [{ key: 'tier', label: TIER_LABEL[state.tier], clear: () => onChange({ tier: null }) }] : []),
    ...state.stack.map((t) => ({
      key: `s-${t}`,
      label: t,
      clear: () => onChange({ stack: state.stack.filter((x) => x !== t) }),
    })),
  ];

  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <label className="group relative flex items-center gap-2 flex-1 min-w-[220px] max-w-md border border-border bg-background/40 px-3 py-1.5 focus-within:border-primary/60 transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors shrink-0" aria-hidden="true" />
          <span className="sr-only">Search the work</span>
          <input
            ref={searchRef}
            type="search"
            value={state.query}
            onChange={(e) => onChange({ query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && state.query) {
                e.preventDefault();
                onChange({ query: '' });
              }
            }}
            placeholder="search systems, stack, decisions…"
            maxLength={80}
            className="flex-1 min-w-0 bg-transparent font-mono text-base md:text-[12px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {state.query && (
            <button
              type="button"
              onClick={() => {
                onChange({ query: '' });
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </label>

        <StackPicker
          stack={stack}
          selected={state.stack}
          onToggle={(name) =>
            onChange({
              stack: state.stack.includes(name) ? state.stack.filter((t) => t !== name) : [...state.stack, name],
            })
          }
          onClear={() => onChange({ stack: [] })}
        />

        <div className="flex items-center gap-2 ml-auto">
          <Segmented<SortKey>
            id="sort"
            label="Sort"
            value={state.sort}
            onSelect={(sort) => onChange({ sort })}
            options={SORTS.map((s) => ({ value: s.key, label: s.label, title: s.hint }))}
          />
          <Segmented<WorkView>
            id="view"
            label="View"
            value={state.view}
            onSelect={(view) => onChange({ view })}
            options={(['index', 'cards', 'matrix'] as const).map((v) => {
              const Icon = VIEW_ICONS[v];
              return {
                value: v,
                title: `${v} view`,
                label: (
                  <>
                    <Icon className="w-3 h-3" aria-hidden="true" />
                    <span className="hidden sm:inline">{v}</span>
                  </>
                ),
              };
            })}
          />
        </div>
      </div>

      {/* Tier — horizontally scrollable on a phone rather than wrapping. */}
      <div className="flex items-center gap-3 overflow-x-auto [scrollbar-width:none] -mx-1 px-1">
        <Segmented<Tier | 'all'>
          id="tier"
          label="Tier"
          value={state.tier ?? 'all'}
          onSelect={(tier) => onChange({ tier: tier === 'all' ? null : tier })}
          options={[
            { value: 'all', label: 'all', count: total },
            ...TIERS.filter((t) => tierCounts[t] > 0).map((t) => ({ value: t, label: TIER_LABEL[t], count: tierCounts[t] })),
          ]}
        />
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={shown}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="inline-block text-foreground"
            >
              {shown}
            </motion.span>
          </AnimatePresence>{' '}
          of {total} shown
        </span>
      </div>

      <AnimatePresence initial={false}>
        {tokens.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center gap-1.5 overflow-hidden"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mr-1">filtered by</span>
            {tokens.map((token) => (
              <button
                key={token.key}
                type="button"
                onClick={token.clear}
                aria-label={`Remove filter ${token.label}`}
                className="group inline-flex items-center gap-1.5 border border-primary/40 bg-primary/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:border-primary transition-colors"
              >
                {token.label}
                <X className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => onChange({ query: '', tier: null, stack: [] })}
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
            >
              clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
