import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import type { ToolResult } from '@/lib/aiTools';
import type { Register } from './Citation';

/* ==========================================================================
   EVIDENCE

   What the answer was built from. While it is being written, each lookup
   appears as it runs (StepTrace); once it lands they fold into a drawer
   with the SQL that ran and the rows that came back, so a doubted figure can
   be checked against the same table the page renders from.
   ========================================================================== */

/** One line per tool call, in words a visitor reads: what was looked at, and what came back. */
function stepSummary(item: ToolResult): { label: string; detail: string; outcome: string; failed: boolean } {
  const failed = item.content.startsWith('error');
  const outcome = failed
    ? 'error, adjusting'
    : item.table
      ? `${item.table.rows.length} row${item.table.rows.length === 1 ? '' : 's'}`
      : 'read';
  const names: Record<string, string> = {
    run_sql: 'query',
    search_site: 'search',
    get_project: 'project',
    get_experience: 'role',
    compare_projects: 'compare',
    get_tradeoffs: 'trade-offs',
  };
  if (item.sql) return { label: 'query', detail: item.sql, outcome, failed };
  const firstLine = item.content.split('\n')[0] ?? '';
  const subject = firstLine.startsWith('id: ') ? firstLine.slice(4) : firstLine.startsWith('title: ') ? firstLine.slice(7) : '';
  return { label: names[item.name] ?? item.name.replace(/^get_/, ''), detail: subject, outcome, failed };
}

export function StepTrace({ items, register }: { items: ToolResult[]; register: Register }) {
  const reading = register === 'reading';
  return (
    <ol className="mb-3 space-y-0.5" aria-label="What the answer is being built from">
      {items.map((item) => {
        const step = stepSummary(item);
        return (
          <li
            key={item.callId}
            className={`ai-step flex items-baseline gap-2 leading-[1.7] min-w-0 ${reading ? 'font-sans text-[12px]' : 'text-[11px]'}`}
          >
            <span className="text-primary/80 shrink-0 select-none" aria-hidden="true">
              ›
            </span>
            <span className="text-muted-foreground shrink-0">{step.label}</span>
            <span className={`text-muted-quiet truncate min-w-0 ${reading && item.sql ? 'font-mono text-[11px]' : ''}`}>{step.detail}</span>
            <span className={`shrink-0 tabular-nums ${step.failed ? 'text-status-warn' : 'text-muted-foreground'}`}>{step.outcome}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Evidence({ items, register }: { items: ToolResult[]; register: Register }) {
  const [open, setOpen] = useState(false);
  const reading = register === 'reading';
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`tap inline-flex items-center gap-1.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors ${
          reading ? 'font-sans text-[12.5px]' : 'font-mono text-[11px]'
        }`}
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        Evidence ({items.length})
      </button>

      {open && (
        <div className="mt-2 border-l border-border pl-3 space-y-3" data-lenis-prevent>
          {items.map((item) => (
            <div key={item.callId} className="font-mono text-[11px]">
              <div className="text-muted-foreground mb-1">{stepSummary(item).label}</div>
              {item.sql && <div className="text-primary/80 whitespace-pre-wrap break-words mb-1">{item.sql}</div>}
              {item.table ? (
                <div className="overflow-x-auto">
                  <table className="text-muted-foreground border-collapse">
                    <thead>
                      <tr>
                        {item.table.columns.map((col) => (
                          <th key={col} className="text-left pr-5 pb-1 text-[10.5px] text-muted-quiet font-normal">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {item.table.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="pr-5 align-top whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted-quiet whitespace-pre-wrap break-words">
                  {item.content}
                  {item.content.length >= 600 ? '…' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
