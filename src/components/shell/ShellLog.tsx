import { useState } from 'react';

import { highlight, type TokenKind } from '@/lib/shell/highlight';
import type { LinesOutput, ShellOutput, TableOutput } from '@/lib/shell/types';
import { promptFor, type CompletionMenu as Menu, type TerminalSession } from '@/components/hero/useTerminalSession';
import type { LogEntry } from './sessionStore';

/* ==========================================================================
   SHELL LOG

   The scrollback, shared by the hero and the drop-down console, so a table
   or a highlighted file looks the same in both. Each command is a group:
   its prompt line, its output, and (on hover, focus, or always for the
   newest) Copy, Rerun and Ask about this. The newest also offers its next
   steps as chips.

   Output is typed, and each type has one way to look:
     lines   monospace, padded columns kept (scrolls sideways, never wraps)
     prose   reading width, wrapped, a little more air between paragraphs
     code    highlighted, three languages, tokens coloured by kind only
     table   header in caps over a hairline, rows tappable when they lead
             somewhere
   ========================================================================== */

const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: 'text-foreground/85',
  keyword: 'text-primary',
  string: 'text-status-ok',
  comment: 'text-muted-ghost italic',
  number: 'text-primary/80',
  function: 'text-foreground',
};

const ROW_BUTTON = 'block w-full text-left hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-none group';

export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <pre className="whitespace-pre overflow-x-auto max-w-full border-l border-rule-strong pl-3 my-1 leading-[1.65]" data-lenis-prevent>
      <code>
        {highlight(code, lang).map((token, i) => (
          <span key={i} className={TOKEN_CLASS[token.kind]}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  );
}

function LinesView({ output, onRun }: { output: LinesOutput; onRun: (line: string) => void }) {
  if (output.lang) return <CodeBlock code={output.lines.join('\n')} lang={output.lang} />;

  if (output.style === 'prose') {
    return (
      <div className="font-sans text-[14px] md:text-[15px] leading-[1.7] text-foreground/85 max-w-[68ch] space-y-3 my-1 [text-wrap:pretty]">
        {output.lines.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    );
  }

  const tone = output.style === 'error' ? 'text-status-warn' : output.style === 'muted' ? 'text-muted-quiet' : 'text-muted-foreground';
  // Notes and errors are sentences, so they wrap; listings keep their columns.
  const wrap = output.style === 'muted' || output.style === 'error' ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto';
  return (
    <div className={`${wrap} max-w-full ${tone}`} data-lenis-prevent>
      {output.lines.map((line, i) => {
        const run = output.runs?.[i];
        if (!run) return <div key={i}>{line || ' '}</div>;
        return (
          <button key={i} type="button" onClick={() => onRun(run)} className={`${ROW_BUTTON} tap md:min-h-0`} title={run}>
            <span className="group-hover:text-primary transition-colors">{line}</span>
          </button>
        );
      })}
    </div>
  );
}

function TableView({ output, onRun }: { output: TableOutput; onRun: (line: string) => void }) {
  const cells = output.rows.map((row) => row.map((c) => String(c)));
  const widths = output.columns.map((column, i) => Math.max(column.length, ...cells.map((row) => (row[i] ?? '').length)) + 2);
  const pad = (values: string[]) => values.map((v, i) => (i === values.length - 1 ? v : (v ?? '').padEnd(widths[i])));

  return (
    <div className="whitespace-pre overflow-x-auto max-w-full text-muted-foreground" data-lenis-prevent>
      <div className="text-muted-quiet">{pad(output.columns.map((c) => c.toUpperCase())).join('')}</div>
      <div className="text-muted-ghost" aria-hidden="true">
        {widths.map((w) => '─'.repeat(w - 2)).join('  ')}
      </div>
      {cells.length === 0 && <div className="text-muted-quiet">0 rows</div>}
      {cells.map((row, r) => {
        const run = output.runs?.[r];
        const content = pad(row).map((value, i) => (
          <span key={i} className={i === 0 ? 'text-foreground/80 group-hover:text-primary transition-colors' : undefined}>
            {value}
          </span>
        ));
        return run ? (
          <button key={r} type="button" onClick={() => onRun(run)} className={`${ROW_BUTTON} tap md:min-h-0`} title={run}>
            {content}
          </button>
        ) : (
          <div key={r}>{content}</div>
        );
      })}
      <div className="text-muted-quiet mt-1">
        {output.footer ?? `${output.rows.length} row${output.rows.length === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}

export function OutputView({ output, onRun }: { output: ShellOutput; onRun: (line: string) => void }) {
  if (output.kind === 'lines') return <LinesView output={output} onRun={onRun} />;
  if (output.kind === 'table') return <TableView output={output} onRun={onRun} />;
  return <div className="text-muted-foreground">{output.node}</div>;
}

/* ── Entry actions ──────────────────────────────────────────────────────── */

const ACTION = 'tap inline-flex items-center px-1.5 -my-1 font-sans text-[11.5px] text-muted-quiet hover:text-foreground focus-visible:text-foreground transition-colors';

function EntryActions({ entry, session, always }: { entry: LogEntry; session: TerminalSession; always: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span
      className={`ml-auto shrink-0 flex items-center gap-0.5 transition-opacity ${
        always ? '' : 'opacity-0 group-hover/entry:opacity-100 focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100'
      }`}
    >
      <button
        type="button"
        className={ACTION}
        onClick={() => {
          void session.copyEntry(entry).then((ok) => {
            if (!ok) return;
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }}
        aria-label={`Copy the output of ${entry.line}`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <button type="button" className={ACTION} onClick={() => session.rerun(entry)} disabled={session.running !== null} aria-label={`Run ${entry.line} again`}>
        Rerun
      </button>
      {session.askAbout && (
        <button type="button" className={ACTION} onClick={() => session.askAbout?.(entry)} aria-label={`Ask the assistant about the output of ${entry.line}`}>
          Ask about this
        </button>
      )}
    </span>
  );
}

function Pending({ entry, session }: { entry: LogEntry; session: TerminalSession }) {
  const pending = entry.pending;
  if (!pending) return null;
  return (
    <div className="my-1.5 border border-border px-3 py-2 max-w-full">
      <div className="text-foreground whitespace-pre-wrap break-all">
        <span className="text-primary">→ </span>
        {pending.command}
      </div>
      {pending.why && <div className="font-sans text-[13px] text-muted-foreground mt-0.5">{pending.why}</div>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 font-sans text-[12.5px]">
        <button type="button" onClick={() => session.runPending(entry)} disabled={session.running !== null} className="tap text-primary hover:underline">
          Run it
        </button>
        {pending.source === 'assistant' && (
          <button type="button" onClick={() => session.usePending(entry)} className="tap text-muted-foreground hover:text-foreground">
            Put it on the line
          </button>
        )}
        <button type="button" onClick={() => session.dismissPending(entry)} className="tap text-muted-quiet hover:text-foreground">
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ── The log ────────────────────────────────────────────────────────────── */

export default function ShellLog({ session, className = '' }: { session: TerminalSession; className?: string }) {
  const { entries, submit, running } = session;
  const lastCmd = [...entries].reverse().find((e) => e.kind === 'cmd');
  const onRun = (line: string) => {
    if (!running) submit(line);
  };

  return (
    <div className={className} role="log" aria-live="polite" aria-relevant="additions" aria-label="Terminal output">
      {entries.map((entry) => {
        const newest = entry === lastCmd;
        return (
          <div key={entry.id} className="group/entry w-full min-w-0" data-line-type={entry.kind === 'cmd' ? 'cmd' : 'output'}>
            {entry.kind === 'cmd' && (
              <div className="flex flex-wrap items-baseline gap-x-2 min-w-0">
                <span className="text-foreground font-medium whitespace-pre-wrap [overflow-wrap:anywhere] min-w-0">
                  <span className="text-primary/80">{promptFor(entry.cwd ?? '/')} </span>
                  {entry.line}
                </span>
                {entry.done && entry.blocks.length > 0 && <EntryActions entry={entry} session={session} always={newest} />}
              </div>
            )}
            {entry.blocks.length > 0 && (
              <div className="mb-1 min-w-0">
                {entry.blocks.map((block) => (
                  <OutputView key={block.id} output={block.output} onRun={onRun} />
                ))}
              </div>
            )}
            <Pending entry={entry} session={session} />
            {entry.done && entry.status !== undefined && entry.status !== 0 && entry.status !== 130 && (
              <div className="text-muted-ghost text-[11px] -mt-0.5 mb-1" aria-label={`exit status ${entry.status}`}>
                exit {entry.status}
              </div>
            )}
            {newest && entry.done && !running && entry.next && entry.next.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 mt-1.5 mb-2" aria-label="Next steps">
                {entry.next.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onRun(step)}
                    className="tap inline-flex items-center border border-border hover:border-rule-strong px-2 py-0.5 text-[11.5px] md:text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {step}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Completion menu ────────────────────────────────────────────────────── */

const KIND_MARK: Record<string, string> = { command: 'cmd', dir: 'dir', file: 'file', flag: 'flag', value: 'val', sql: 'sql' };

export function CompletionList({ menu, onPick, className = '' }: { menu: Menu; onPick: (index: number) => void; className?: string }) {
  return (
    <ul
      id={menu.id}
      role="listbox"
      aria-label="Completions"
      className={`max-h-56 overflow-y-auto bg-popover font-mono text-[12.5px] md:text-[13px] py-1 shadow-[0_0_0_1px_hsl(var(--rule-strong)),0_16px_40px_-16px_rgba(0,0,0,0.8)] ${className}`}
      data-lenis-prevent
    >
      {menu.items.map((item, i) => (
        <li
          key={`${item.value}-${i}`}
          id={`${menu.id}-${i}`}
          role="option"
          aria-selected={i === menu.active}
          onMouseDown={(e) => {
            // Keep focus on the prompt.
            e.preventDefault();
            onPick(i);
          }}
          className={`tap md:min-h-0 flex items-center justify-between gap-4 px-3 py-1 cursor-pointer ${
            i === menu.active ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="truncate">{item.label}</span>
          <span className="text-muted-ghost text-[10.5px] shrink-0">{KIND_MARK[item.kind]}</span>
        </li>
      ))}
    </ul>
  );
}

