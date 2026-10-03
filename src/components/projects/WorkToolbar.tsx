import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';

import { TIER_LABEL } from './tiers';
import { SORTS, TIERS, type SortKey, type Tier, type WorkState, type WorkView } from './workModel';

/* ==========================================================================
   WORK TOOLBAR

   A search line and one disclosure.

   Most visitors want to read the index, not operate it, so at rest the
   index is preceded by a single ruled search field and a count. Everything
   that narrows or re-arranges the list — tier, stack, sort, and the two
   other views (cards, the stack matrix) — sits behind "Filter", one click
   away and never gone. It opens on its own when the page arrives already
   filtered or in another view, so a shared link shows what shaped it.

     search   · across everything the case studies say, not just names
     tier     · flagships, production, prototypes, design studies
     stack    · the full list, with counts, in a popover
     sort     · tier, newest, or how much the write-up documents
     view     · index, cards, or the stack matrix

   Active filters surface once, under the search line, as words that remove
   themselves when clicked — what is narrowing the list is always visible
   and one click from undone.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

const VIEW_LABEL: Record<WorkView, string> = { index: 'List', cards: 'Pictures', matrix: 'Tools table' };
const SORT_LABEL: Record<SortKey, string> = { tier: 'By type', newest: 'Newest first', depth: 'Most detailed first' };
const SORT_HINT: Record<SortKey, string> = {
  tier: 'Flagships first, then the rest',
  newest: 'Most recent work first',
  depth: 'The longest write-ups first',
};
const TIER_OPTION_LABEL: Record<string, string> = {
  flagship: 'Flagship',
  production: 'Production',
  system: 'Prototype',
  design: 'Designed, not built',
};

interface WorkToolbarProps {
  state: WorkState;
  onChange: (patch: Partial<WorkState>) => void;
  tierCounts: Record<Tier, number>;
  stack: { name: string; count: number }[];
  total: number;
  shown: number;
}

/* ── Text options ────────────────────────────────────────────────────────
   A radio group drawn as words. The chosen one is in ink with a hairline of
   the accent under it, which slides to the next choice. */

function TextOptions<T extends string>({
  id,
  label,
  options,
  value,
  onSelect,
}: {
  id: string;
  label: string;
  options: { value: T; label: ReactNode; title?: string; count?: number }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1" role="radiogroup" aria-label={label}>
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
            className={`tap relative flex items-center gap-1.5 py-1.5 text-[14px] whitespace-nowrap transition-colors ${
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className="t-folio">{option.count}</span>}
            {selected && (
              <motion.span
                layoutId={`opt-${id}`}
                className="absolute left-0 right-0 bottom-0.5 h-px bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                aria-hidden="true"
              />
            )}
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
        className={`tap flex items-center gap-1.5 py-1.5 text-[14px] transition-colors ${
          selected.length || open ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {selected.length ? `${selected.length} selected` : 'Any tool'}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Filter by tool"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: EASE }}
            className="absolute z-40 left-0 top-[calc(100%+8px)] w-[min(320px,calc(100vw-2.5rem))] bg-popover shadow-[0_0_0_1px_hsl(var(--border)),0_24px_60px_-20px_rgba(0,0,0,0.85)] origin-top-left"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find a tool"
                aria-label="Find a tool"
                className="flex-1 min-w-0 bg-transparent text-base md:text-[13px] text-foreground placeholder:text-muted-quiet focus:outline-none"
              />
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <ul className="max-h-72 overflow-y-auto overscroll-contain py-1" aria-label="Tools" data-lenis-prevent>
              {visible.map((tech) => {
                const on = selected.includes(tech.name);
                return (
                  <li key={tech.name}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => onToggle(tech.name)}
                      className="tap group w-full flex items-center gap-3 px-3 py-1.5 text-left hover:bg-foreground/[0.03] transition-colors"
                    >
                      <span
                        className={`w-3.5 h-3.5 shrink-0 flex items-center justify-center transition-colors ${
                          on
                            ? 'bg-primary text-primary-foreground'
                            : 'shadow-[inset_0_0_0_1px_hsl(var(--muted-foreground))] group-hover:shadow-[inset_0_0_0_1px_hsl(var(--foreground))]'
                        }`}
                        aria-hidden="true"
                      >
                        {on && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                      </span>
                      <span className={`flex-1 text-[13px] truncate ${on ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        {tech.name}
                      </span>
                      {/* Usage as a length as well as a number: a few heavy
                          hitters and a long tail read at a glance. */}
                      <span className="w-12 h-px bg-border shrink-0" aria-hidden="true">
                        <span className="block h-full bg-foreground/60" style={{ width: `${(tech.count / max) * 100}%` }} />
                      </span>
                      <span className="w-4 text-right t-folio">{tech.count}</span>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && <li className="px-3 py-4 t-caption">Nothing by that name.</li>}
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
  const panelId = useId();
  const prefersReduced = useReducedMotion();

  const shaped = Boolean(state.tier || state.stack.length || state.sort !== 'tier' || state.view !== 'index');
  const [open, setOpen] = useState(shaped);
  const activeCount = (state.tier ? 1 : 0) + state.stack.length + (state.sort !== 'tier' ? 1 : 0) + (state.view !== 'index' ? 1 : 0);

  /* Another section can filter the list (About's stack does, by event);
     the panel opens so the reader sees what changed it. */
  const stackKey = state.stack.join('|');
  const [seenStack, setSeenStack] = useState(stackKey);
  if (stackKey !== seenStack) {
    setSeenStack(stackKey);
    if (stackKey && !open) setOpen(true);
  }

  const tokens: { key: string; label: string; clear: () => void }[] = [
    ...(state.query.trim() ? [{ key: 'q', label: `“${state.query.trim()}”`, clear: () => onChange({ query: '' }) }] : []),
    ...(state.tier ? [{ key: 'tier', label: TIER_OPTION_LABEL[state.tier] ?? TIER_LABEL[state.tier], clear: () => onChange({ tier: null }) }] : []),
    ...state.stack.map((t) => ({
      key: `s-${t}`,
      label: t,
      clear: () => onChange({ stack: state.stack.filter((x) => x !== t) }),
    })),
  ];

  return (
    <div className="flex flex-col mb-10">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        {/* Search — a ruled line, not a box. */}
        <label className="group relative flex items-center gap-3 flex-1 min-w-[min(100%,260px)] max-w-xl border-b border-rule-strong focus-within:border-foreground pb-2.5 transition-colors duration-300">
          <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors shrink-0" aria-hidden="true" />
          <span className="sr-only">Search the projects</span>
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
            placeholder="Search projects and tools"
            maxLength={80}
            className="flex-1 min-w-0 bg-transparent text-base md:text-[15px] text-foreground placeholder:text-muted-quiet focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {state.query && (
            <button
              type="button"
              onClick={() => {
                onChange({ query: '' });
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              className="p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="flex items-center gap-6 ml-auto">
          <span className="t-caption tabular-nums" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={shown}
                initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="inline-block text-foreground"
              >
                {shown}
              </motion.span>
            </AnimatePresence>{' '}
            of {total}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className={`tap group flex items-center gap-2 py-1.5 text-[14px] transition-colors ${
              open || activeCount ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            Filter
            {activeCount > 0 && (
              <span className="min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[11px] font-medium tabular-nums">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── The disclosure ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            /* Clipped while the height animates, then released, so the stack
               popover can open past the panel's edge. */
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0, overflow: 'hidden' }}
            animate={
              prefersReduced
                ? { opacity: 1 }
                : { opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }
            }
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0, overflow: 'hidden' }}
            transition={{ duration: 0.45, ease: EASE }}
            className="relative z-20"
          >
            <dl className="pt-6 grid grid-cols-1 md:grid-cols-[6rem_minmax(0,1fr)] gap-x-8 gap-y-3 md:gap-y-4 items-baseline pb-2">
              <dt className="t-caption">Type</dt>
              <dd>
                <TextOptions<Tier | 'all'>
                  id="tier"
                  label="Type of project"
                  value={state.tier ?? 'all'}
                  onSelect={(tier) => onChange({ tier: tier === 'all' ? null : tier })}
                  options={[
                    { value: 'all', label: 'All', count: total },
                    ...TIERS.filter((t) => tierCounts[t] > 0).map((t) => ({ value: t, label: TIER_OPTION_LABEL[t], count: tierCounts[t] })),
                  ]}
                />
              </dd>

              <dt className="t-caption">Built with</dt>
              <dd>
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
              </dd>

              <dt className="t-caption">Order</dt>
              <dd>
                <TextOptions<SortKey>
                  id="sort"
                  label="Order"
                  value={state.sort}
                  onSelect={(sort) => onChange({ sort })}
                  options={SORTS.map((s) => ({ value: s.key, label: SORT_LABEL[s.key], title: SORT_HINT[s.key] }))}
                />
              </dd>

              <dt className="t-caption">Show as</dt>
              <dd>
                <TextOptions<WorkView>
                  id="view"
                  label="Show as"
                  value={state.view}
                  onSelect={(view) => onChange({ view })}
                  options={(['index', 'cards', 'matrix'] as const).map((v) => ({ value: v, label: VIEW_LABEL[v], title: `Show as ${VIEW_LABEL[v].toLowerCase()}` }))}
                />
              </dd>
            </dl>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {tokens.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-5">
              <span className="t-caption">Filtered by</span>
              {tokens.map((token) => (
                <button
                  key={token.key}
                  type="button"
                  onClick={token.clear}
                  aria-label={`Remove filter ${token.label}`}
                  className="tap group inline-flex items-center gap-1.5 py-1 text-[13px] text-foreground"
                >
                  <span className="link-draw">{token.label}</span>
                  <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => onChange({ query: '', tier: null, stack: [] })}
                className="tap text-[13px] text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
