import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Copy, Printer, RotateCcw } from 'lucide-react';

import { requestIntent } from '@/components/contact/contactModel';
import { runAction } from '@/lib/aiActions';
import { evidenceLabel, fitDraft, fitTally, fitText, VERDICT_LABEL } from '@/lib/aiFit';
import type { FitEvidence, FitRequirement, FitResult, FitVerdict } from '@/lib/aiProtocol';
import type { ModeProps } from './index';
import { createStore, useStore } from './store';
import { postStream } from './stream';

/* ==========================================================================
   ROLE FIT

   A recruiter pastes a job description; the site answers it requirement by
   requirement. Each requirement gets a verdict (strong, partial, or not
   shown on this site) and the passages that support it, copied verbatim
   from the site's own data. The server checks every quote against the data
   and removes any it cannot find, and says how many it removed: a fit check
   that overstates is worse than none.

   The description goes to the AI provider for the comparison and is not
   stored, and the page says so before anything is sent.
   ========================================================================== */

const MAX_JD = 8000;
const MIN_JD = 80;

interface FitState {
  jd: string;
  phase: 'idle' | 'running' | 'done' | 'error';
  status: string;
  result: FitResult | null;
  error: string | null;
  retryable: boolean;
}

const store = createStore<FitState>({ jd: '', phase: 'idle', status: '', result: null, error: null, retryable: false });
let controller: AbortController | null = null;

async function runFit() {
  const { jd } = store.get();
  controller?.abort();
  controller = new AbortController();
  store.set({ phase: 'running', status: 'Reading the description', result: null, error: null });
  let result: FitResult | null = null;
  const failure = await postStream(
    '/api/fit',
    { jd: jd.slice(0, MAX_JD) },
    (event) => {
      if (event.type === 'status') store.set({ status: event.text });
      else if (event.type === 'fit') result = event.result;
    },
    controller.signal
  );
  if (controller.signal.aborted) return;
  if (failure) store.set({ phase: 'error', error: failure.error, retryable: failure.retryable });
  else if (result) store.set({ phase: 'done', result });
  else store.set({ phase: 'error', error: 'The check finished without a result. Please try again.', retryable: true });
}

function cancelFit() {
  controller?.abort();
  store.set({ phase: 'idle', status: '' });
}

/* ── Verdict mark: shape and word together, never colour alone ─────────── */

function VerdictMark({ verdict }: { verdict: FitVerdict }) {
  const mark =
    verdict === 'strong' ? (
      <span className="block w-2.5 h-2.5 bg-status-ok" />
    ) : verdict === 'partial' ? (
      <span className="block w-2.5 h-2.5 border border-status-warn bg-[linear-gradient(to_right,hsl(var(--status-warn))_50%,transparent_50%)]" />
    ) : (
      <span className="block w-2.5 h-2.5 border border-muted-foreground" />
    );
  return (
    <span className="inline-flex items-center gap-2 text-[12px] whitespace-nowrap">
      <span aria-hidden="true">{mark}</span>
      <span className={verdict === 'not-shown' ? 'text-muted-foreground' : 'text-foreground'}>{VERDICT_LABEL[verdict]}</span>
    </span>
  );
}

function EvidenceChip({ evidence, onOpen }: { evidence: FitEvidence; onOpen: () => void }) {
  const tip = useId();
  return (
    <span className="relative inline-flex group/chip">
      <button
        type="button"
        onClick={onOpen}
        aria-describedby={tip}
        className="tap inline-flex items-center gap-1.5 py-1 text-[12.5px] text-foreground bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[length:0%_1px] bg-[position:0_100%] transition-[background-size] duration-500 ease-out-expo hover:bg-[length:100%_1px] focus-visible:bg-[length:100%_1px]"
      >
        {evidenceLabel(evidence)}
        <ArrowRight className="w-3 h-3 opacity-60" aria-hidden="true" />
      </button>
      {/* The quote, on hover or focus: what on the site supports the verdict. */}
      <span
        id={tip}
        role="tooltip"
        className="pointer-events-none absolute left-0 bottom-full mb-2 z-10 w-[min(22rem,70vw)] p-3 text-[12.5px] leading-[1.55] text-foreground bg-popover shadow-[0_0_0_1px_hsl(var(--border)),0_18px_48px_-16px_rgba(0,0,0,0.8)] opacity-0 translate-y-1 transition-[opacity,transform] duration-200 group-hover/chip:opacity-100 group-hover/chip:translate-y-0 group-focus-within/chip:opacity-100 group-focus-within/chip:translate-y-0"
      >
        &ldquo;{evidence.quote}&rdquo;
      </span>
    </span>
  );
}

function Requirement({ item, onOpen }: { item: FitRequirement; onOpen: (e: FitEvidence) => void }) {
  return (
    <li className="py-5 border-t border-border">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-[15px] text-foreground leading-snug max-w-[40ch]">{item.requirement}</p>
        <VerdictMark verdict={item.verdict} />
      </div>
      {item.note && <p className="mt-2 t-caption">{item.note}</p>}
      {item.evidence.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          {item.evidence.map((e, i) => (
            <EvidenceChip key={`${e.kind}-${e.id}-${i}`} evidence={e} onOpen={() => onOpen(e)} />
          ))}
        </div>
      )}
    </li>
  );
}

/* ── Print: only the result, on white ──────────────────────────────────── */

function PrintCopy({ result }: { result: FitResult }) {
  return createPortal(
    <div data-print-fit="">
      <style>{`
        @media screen { [data-print-fit] { display: none; } }
        @media print {
          body > *:not([data-print-fit]) { display: none !important; }
          [data-print-fit] { display: block; color: #111; background: #fff; font: 11pt/1.5 Inter, system-ui, sans-serif; padding: 0; }
          [data-print-fit] h1 { font: 600 18pt/1.2 Archivo, Inter, sans-serif; margin: 0 0 8pt; }
          [data-print-fit] .meta { color: #555; font-size: 9pt; margin-bottom: 12pt; }
          [data-print-fit] li { break-inside: avoid; border-top: 0.5pt solid #ccc; padding: 8pt 0; list-style: none; }
          [data-print-fit] ul { padding: 0; margin: 0; }
          [data-print-fit] .quote { color: #444; font-size: 9.5pt; margin: 2pt 0 0 10pt; }
        }
      `}</style>
      <h1>{result.role ? `Role fit: ${result.role}` : 'Role fit'}</h1>
      <p className="meta">Checked against builtbyem.dev · {fitTally(result.requirements)}</p>
      <p>{result.summary}</p>
      <ul>
        {result.requirements.map((r, i) => (
          <li key={i}>
            <strong>{VERDICT_LABEL[r.verdict]}:</strong> {r.requirement}
            {r.note && <div>{r.note}</div>}
            {r.evidence.map((e, j) => (
              <div key={j} className="quote">
                {evidenceLabel(e)}: &ldquo;{e.quote}&rdquo;
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
}

/* ── The mode ──────────────────────────────────────────────────────────── */

export default function FitMode({ onClose }: ModeProps) {
  const state = useStore(store);
  const navigate = useNavigate();
  const fieldId = useId();
  const noteId = useId();
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Bring the result into view as it lands.
  useEffect(() => {
    if (state.phase === 'done') resultRef.current?.focus({ preventScroll: false });
  }, [state.phase]);

  const open = (e: FitEvidence) => {
    void runAction(
      e.kind === 'project'
        ? { kind: 'open-case', id: e.id, section: e.section, quote: e.quote, label: evidenceLabel(e) }
        : { kind: 'open-role', id: e.id, label: evidenceLabel(e) },
      navigate
    );
  };

  const copy = async () => {
    if (!state.result) return;
    try {
      await navigator.clipboard.writeText(fitText(state.result));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the print option still works */
    }
  };

  const send = () => {
    if (!state.result) return;
    requestIntent('role', fitDraft(state.result));
    onClose();
  };

  const length = state.jd.length;
  const tooShort = state.jd.trim().length < MIN_JD;
  const running = state.phase === 'running';

  return (
    <div className="h-full overflow-y-auto px-5 md:px-7 py-6" data-lenis-prevent>
      {state.phase !== 'done' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!tooShort && !running) void runFit();
          }}
        >
          <h3 className="t-subhead text-foreground">Check a role against this site</h3>
          <p className="mt-2 t-caption max-w-[48ch]">
            Paste a job description. Each requirement is matched to evidence from the projects and roles here, or marked as not shown.
          </p>

          <div className="mt-6 flex items-baseline justify-between gap-4">
            <label htmlFor={fieldId} className="t-caption text-foreground">
              Paste a job description
            </label>
            <span className={`text-[12px] tabular-nums ${length > MAX_JD * 0.9 ? 'text-status-warn' : 'text-muted-quiet'}`}>
              {length.toLocaleString()} / {MAX_JD.toLocaleString()}
            </span>
          </div>
          <textarea
            id={fieldId}
            value={state.jd}
            maxLength={MAX_JD}
            disabled={running}
            onChange={(e) => store.set({ jd: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !tooShort && !running) {
                e.preventDefault();
                void runFit();
              }
            }}
            aria-describedby={noteId}
            rows={10}
            placeholder="Senior Data Engineer. You will design and run event-driven pipelines…"
            className="mt-2 w-full resize-y min-h-[11rem] bg-transparent border border-border focus:border-rule-strong outline-none focus-visible:outline-none p-3 text-[15px] leading-[1.6] text-foreground placeholder:text-muted-quiet transition-colors disabled:opacity-60"
          />
          <p id={noteId} className="mt-2 text-[12px] leading-[1.55] text-muted-quiet">
            The text is sent to the AI provider to compare it with this site. It is not stored.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            {running ? (
              <>
                <p className="inline-flex items-center gap-2.5 text-[13px] text-foreground" role="status" aria-live="polite">
                  <span className="w-1.5 h-1.5 bg-primary status-live" aria-hidden="true" />
                  {state.status || 'Working'}
                </p>
                <button type="button" onClick={cancelFit} className="tap text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="submit" disabled={tooShort} className="btn-ink tap group">
                  Check the fit
                  <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
                </button>
                {tooShort && length > 0 && <span className="t-caption">Paste a few more lines first.</span>}
              </>
            )}
          </div>

          {state.phase === 'error' && state.error && (
            <div role="alert" className="mt-5 border-t border-border pt-4">
              <p className="text-[14px] text-foreground">{state.error}</p>
              {state.retryable && (
                <button type="button" onClick={() => void runFit()} className="tap mt-2 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Try again
                </button>
              )}
            </div>
          )}
        </form>
      )}

      {state.phase === 'done' && state.result && (
        <div ref={resultRef} tabIndex={-1} className="outline-none" aria-labelledby={`${fieldId}-result`}>
          <p className="t-caption">Role fit</p>
          <h3 id={`${fieldId}-result`} className="mt-1 t-heading text-foreground">
            {state.result.role || 'The role you pasted'}
          </h3>
          <p className="mt-4 text-[15px] leading-[1.65] text-foreground/90 max-w-[60ch]">{state.result.summary}</p>
          <p className="mt-4 text-[13px] text-foreground tabular-nums">{fitTally(state.result.requirements)}</p>
          {state.result.rejectedEvidence > 0 && (
            <p className="mt-2 t-caption">
              {state.result.rejectedEvidence} {state.result.rejectedEvidence === 1 ? 'piece of evidence was' : 'pieces of evidence were'} removed
              because {state.result.rejectedEvidence === 1 ? 'it' : 'they'} could not be found on the site.
            </p>
          )}

          <ul className="mt-6 border-b border-border">
            {state.result.requirements.map((item, i) => (
              <Requirement key={i} item={item} onOpen={open} />
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="button" onClick={send} className="btn-ink tap group">
              Send to Emmanuel
              <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => void copy()} className="tap inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-status-ok" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy as text'}
            </button>
            <button type="button" onClick={() => window.print()} className="tap inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              Print or save as PDF
            </button>
            <button
              type="button"
              onClick={() => store.set({ phase: 'idle', result: null })}
              className="tap inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Check another role
            </button>
          </div>
          <p className="mt-4 text-[12px] text-muted-quiet">Every quote above was checked against the site before it was shown.</p>
          <PrintCopy result={state.result} />
        </div>
      )}
    </div>
  );
}
