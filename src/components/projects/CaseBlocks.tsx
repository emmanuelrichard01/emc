import { useLayoutEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import type { CaseBlock, FieldNote } from '@/types';

/* ==========================================================================
   CASE-STUDY BLOCKS

   What a case study can show beyond its paragraphs. Four kinds, each of which
   earns its place by doing something prose cannot:

     architecture  the system's shape, which a paragraph can only list
     code          the few lines that hold a decision in place, linked to source
     figure        a picture of the result
     callout       one sentence that must not be skimmed past

   Plus field notes — debugging stories — which get their own section.
   ========================================================================== */

/* ── Architecture ─────────────────────────────────────────────────────────
   Columns are laid out by CSS and the connectors are drawn *afterwards*,
   measured from where the nodes actually landed. Computing positions by hand
   would mean a second layout engine that disagrees with the browser the
   moment a label wraps; measuring means the lines are always attached to the
   boxes they name, at any width and after the fonts arrive.

   Below md the columns stack and lines would cross everything, so they are
   replaced by the same edges written out as a list — which is also what a
   screen reader gets at every width. */

interface DrawnEdge {
  key: string;
  d: string;
  label?: string;
  lx: number;
  ly: number;
}

type Architecture = Extract<CaseBlock, { kind: 'architecture' }>;

function ArchitectureDiagram({ block }: { block: Architecture }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<DrawnEdge[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const labelOf = (id: string) =>
    block.columns.flatMap((c) => c.nodes).find((n) => n.id === id)?.label ?? id;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const measure = () => {
      if (!window.matchMedia('(min-width: 768px)').matches) {
        setEdges([]);
        return;
      }
      const box = root.getBoundingClientRect();
      setSize({ w: box.width, h: box.height });
      const rectOf = (id: string) => root.querySelector(`[data-node="${id}"]`)?.getBoundingClientRect();

      const drawn: DrawnEdge[] = [];
      for (const edge of block.edges) {
        const a = rectOf(edge.from);
        const b = rectOf(edge.to);
        if (!a || !b) continue;

        let x1: number, y1: number, x2: number, y2: number, d: string;
        const midY = (r: DOMRect) => r.top + r.height / 2 - box.top;
        const midX = (r: DOMRect) => r.left + r.width / 2 - box.left;

        if (b.left >= a.right - 1 || a.left >= b.right - 1) {
          // Across columns: side to side, as a gentle S.
          const forward = b.left >= a.right - 1;
          x1 = (forward ? a.right : a.left) - box.left;
          x2 = (forward ? b.left : b.right) - box.left;
          y1 = midY(a);
          y2 = midY(b);
          const mx = (x1 + x2) / 2;
          d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
        } else {
          // Within a column: top to bottom.
          const down = b.top >= a.bottom - 1;
          x1 = midX(a);
          x2 = midX(b);
          y1 = (down ? a.bottom : a.top) - box.top;
          y2 = (down ? b.top : b.bottom) - box.top;
          const my = (y1 + y2) / 2;
          d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
        }

        drawn.push({ key: `${edge.from}->${edge.to}`, d, label: edge.label, lx: (x1 + x2) / 2, ly: (y1 + y2) / 2 });
      }
      setEdges(drawn);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll('[data-node]').forEach((node) => observer.observe(node));
    // Webfonts change label widths after first paint.
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [block]);

  return (
    <figure className="my-2">
      <div className="relative border border-border bg-card/40 p-5 md:p-7 overflow-hidden">
        <div
          ref={ref}
          className="relative grid gap-y-8 gap-x-12 md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
          style={{ ['--cols' as string]: block.columns.length }}
        >
          {edges.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none overflow-visible"
              width={size.w}
              height={size.h}
              aria-hidden="true"
            >
              <defs>
                <marker id="arch-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L8,4 L0,8 z" fill="hsl(var(--primary) / 0.7)" />
                </marker>
              </defs>
              {edges.map((edge) => (
                <path
                  key={edge.key}
                  d={edge.d}
                  fill="none"
                  stroke="hsl(var(--primary) / 0.45)"
                  strokeWidth="1.25"
                  markerEnd="url(#arch-arrow)"
                />
              ))}
            </svg>
          )}

          {block.columns.map((column) => (
            <div key={column.label} className="relative flex flex-col gap-3 md:justify-center">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{column.label}</span>
              {column.nodes.map((node) => (
                <div key={node.id} data-node={node.id} className="relative border border-border bg-background px-3.5 py-2.5">
                  <span className="block text-[13px] font-medium text-foreground leading-snug">{node.label}</span>
                  {node.detail && (
                    <span className="block text-[12px] text-muted-foreground leading-snug mt-0.5">{node.detail}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Labels on their own layer, above the boxes. Drawn with the lines
              they sat under the nodes, and a label longer than the gap
              between two columns disappeared behind the boxes either side. */}
          {edges.some((edge) => edge.label) && (
            <svg
              className="absolute inset-0 z-10 pointer-events-none overflow-visible"
              width={size.w}
              height={size.h}
              aria-hidden="true"
            >
              {edges.map((edge) =>
                edge.label ? (
                  <text
                    key={`${edge.key}:label`}
                    x={edge.lx}
                    y={edge.ly - 5}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize="11"
                    fill="hsl(var(--muted-foreground))"
                    stroke="hsl(var(--card))"
                    strokeWidth="4"
                    paintOrder="stroke"
                  >
                    {edge.label}
                  </text>
                ) : null
              )}
            </svg>
          )}
        </div>

        {/* The same edges in words: the whole diagram below md, and the whole
            diagram for a screen reader at every width. */}
        <ul className="mt-6 space-y-1 font-mono text-[12px] text-muted-foreground md:sr-only">
          {block.edges.map((edge) => (
            <li key={`${edge.from}->${edge.to}`}>
              {labelOf(edge.from)} <span className="text-primary">→</span> {labelOf(edge.to)}
              {edge.label ? ` · ${edge.label}` : ''}
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 text-[13px] text-muted-foreground leading-relaxed max-w-[68ch]">{block.caption}</figcaption>
    </figure>
  );
}

/* ── Code ─────────────────────────────────────────────────────────────── */

function CodeExcerpt({ block }: { block: Extract<CaseBlock, { kind: 'code' }> }) {
  return (
    <figure className="my-2">
      <div className="border border-border bg-card/60">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{block.lang}</span>
          {block.href && (
            <a
              href={block.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors py-1"
            >
              view source <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          )}
        </div>
        <pre className="overflow-x-auto p-4 text-[12.5px] leading-[1.7] font-mono text-foreground/90">
          <code>{block.code}</code>
        </pre>
      </div>
      <figcaption className="mt-3 text-[13px] text-muted-foreground leading-relaxed max-w-[68ch]">{block.caption}</figcaption>
    </figure>
  );
}

/* ── Figure / callout ─────────────────────────────────────────────────── */

function Figure({ block }: { block: Extract<CaseBlock, { kind: 'figure' }> }) {
  return (
    <figure className="my-2">
      <img src={block.src} alt={block.alt} loading="lazy" decoding="async" className="w-full border border-border" />
      {block.caption && (
        <figcaption className="mt-3 text-[13px] text-muted-foreground leading-relaxed max-w-[68ch]">{block.caption}</figcaption>
      )}
    </figure>
  );
}

function Callout({ text }: { text: string }) {
  return (
    <p className="border-l-2 border-primary/60 pl-4 text-[15px] text-foreground leading-relaxed max-w-[68ch]">{text}</p>
  );
}

export function CaseBlocks({ blocks }: { blocks?: CaseBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="mt-8 flex flex-col gap-8">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'architecture':
            return <ArchitectureDiagram key={i} block={block} />;
          case 'code':
            return <CodeExcerpt key={i} block={block} />;
          case 'figure':
            return <Figure key={i} block={block} />;
          case 'callout':
            return <Callout key={i} text={block.text} />;
        }
      })}
    </div>
  );
}

/* ── Field notes ──────────────────────────────────────────────────────────
   Symptom, the explanations that did not hold, what it actually was, the fix,
   and what now stops it coming back. The wrong turns are shown struck through
   in the same visual language as a rejected trade-off: both are the part of
   engineering most write-ups leave out. */

export function FieldNotes({ notes }: { notes: FieldNote[] }) {
  return (
    <ol className="flex flex-col gap-px bg-border border border-border">
      {notes.map((note, i) => (
        <li key={note.title} className="bg-card p-5 md:p-7">
          <h3 className="flex items-baseline gap-3 mb-5">
            <span className="font-mono text-[11px] tabular-nums text-primary">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[16px] md:text-[17px] font-semibold text-foreground leading-snug">{note.title}</span>
          </h3>

          <dl className="grid grid-cols-1 sm:grid-cols-[7.5rem_1fr] gap-x-5 gap-y-3 text-[14px] leading-[1.7]">
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-1">symptom</dt>
            <dd className="text-foreground/85">{note.symptom}</dd>

            {note.wrongTurns?.length ? (
              <>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-1">tried</dt>
                <dd>
                  <ul className="space-y-1">
                    {note.wrongTurns.map((turn) => (
                      <li key={turn} className="text-muted-foreground line-through decoration-muted-foreground/40">
                        {turn}
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            ) : null}

            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary sm:pt-1">actually</dt>
            <dd className="text-foreground">{note.rootCause}</dd>

            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-1">fix</dt>
            <dd className="text-foreground/85">{note.fix}</dd>

            {note.guard && (
              <>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-400/90 sm:pt-1">guarded by</dt>
                <dd className="text-foreground/85">{note.guard}</dd>
              </>
            )}
          </dl>
        </li>
      ))}
    </ol>
  );
}
