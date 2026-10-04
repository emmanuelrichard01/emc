import React, { useMemo } from 'react';

import type { AnswerDoc, Inline } from '@/lib/aiAnswer';
import { AnswerBlock } from './Blocks';
import { Citation, type Register } from './Citation';
import { readAnswer } from './answerModel';

/* ==========================================================================
   ANSWER BODY

   An answer, drawn from its markup: paragraphs, bullets, the one bold
   phrase, citation chips straight after the claims they support, and the
   blocks the answer asked for. While it streams, a half-written directive is
   held back (parseAnswer's `streaming`), so no literal markup ever flashes.

   Anything the server's check could not find in the site's data (a figure,
   a name) is marked where it stands: a dotted warning underline, titled
   "not found in the site's data". The mark is the claim made at the exact
   spot a reader would otherwise take it on trust.
   ========================================================================== */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function Marked({ text, marks }: { text: string; marks: string[] }) {
  if (!marks.length) return <>{text}</>;
  // Not inside a longer number or word: "99" must not mark "99.5", "Go" must not mark "Google".
  const pattern = new RegExp(`(?<![\\w.,])(${marks.map(escape).join('|')})(?![\\w])`, 'g');
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(last, match.index));
    parts.push(
      <mark
        key={match.index}
        className="bg-transparent text-status-warn underline decoration-dotted decoration-status-warn/80 underline-offset-4"
        title="Not found in the site’s data"
      >
        {match[0]}
      </mark>
    );
    last = match.index! + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function Inlines({ inlines, marks, register }: { inlines: Inline[]; marks: string[]; register: Register }) {
  return (
    <>
      {inlines.map((node, i) =>
        node.type === 'cite' ? (
          <Citation key={i} cite={node.ref} n={node.n} register={register} />
        ) : node.strong ? (
          <strong key={i} className={register === 'terminal' ? 'font-normal text-foreground' : 'font-medium text-foreground'}>
            <Marked text={node.text} marks={marks} />
          </strong>
        ) : (
          <React.Fragment key={i}>
            <Marked text={node.text} marks={marks} />
          </React.Fragment>
        )
      )}
    </>
  );
}

interface AnswerBodyProps {
  text: string;
  streaming?: boolean;
  /** Figures and names to mark as not found. */
  marks?: string[];
  register: Register;
  /** A pre-parsed document, when the caller already has one. */
  doc?: AnswerDoc;
  /** Rendered after the last node while streaming (the caret). */
  tail?: React.ReactNode;
}

export function AnswerBody({ text, streaming = false, marks = [], register, doc: given, tail }: AnswerBodyProps) {
  const doc = useMemo(() => given ?? readAnswer(text, streaming), [given, text, streaming]);
  const reading = register === 'reading';

  if (!doc.nodes.length) return tail ? <div>{tail}</div> : null;

  return (
    <div
      className={
        reading
          ? 'ai-answer font-sans text-[15px] leading-[1.7] text-foreground/90 space-y-3.5'
          : 'ai-answer text-muted-foreground space-y-2 whitespace-normal break-words'
      }
    >
      {doc.nodes.map((node, i) => {
        const last = i === doc.nodes.length - 1;
        if (node.type === 'p') {
          return (
            <p key={i}>
              <Inlines inlines={node.inlines} marks={marks} register={register} />
              {last && tail}
            </p>
          );
        }
        if (node.type === 'list') {
          return (
            <ul key={i} className={reading ? 'space-y-1.5' : 'space-y-0.5'}>
              {node.items.map((item, j) => (
                <li key={j} className="flex gap-3">
                  <span
                    className={reading ? 'mt-[0.8em] w-2.5 h-px shrink-0 bg-rule-strong' : 'shrink-0 text-primary/70 select-none'}
                    aria-hidden="true"
                  >
                    {reading ? null : '-'}
                  </span>
                  <span className="min-w-0">
                    <Inlines inlines={item} marks={marks} register={register} />
                    {last && j === node.items.length - 1 && tail}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <React.Fragment key={i}>
            <AnswerBlock block={node.block} register={register} />
            {last && tail}
          </React.Fragment>
        );
      })}
    </div>
  );
}
