import { describe, expect, it } from 'vitest';

import type { AiEvent } from '@/lib/aiStream';
import { finalText, finishTurn, withAction, type AiTurn } from './useAiSession';

type Done = Extract<AiEvent, { type: 'done' }>;
const done = (extra: Partial<Done> = {}): Done => ({
  type: 'done',
  provider: 'claude',
  sources: [],
  unverified: [],
  cached: false,
  ...extra,
});
const live: AiTurn = { id: 2, role: 'assistant', text: 'partial', streaming: true, status: 'Reading the case study' };

describe('session events', () => {
  it('adds an offered action once', () => {
    const action = { kind: 'open-case', label: 'Take me there', id: 'mmr-engine', section: 'tradeoffs' } as const;
    const once = withAction(live, action);
    expect(once.actions).toHaveLength(1);
    expect(withAction(once, { ...action })).toBe(once);
    expect(withAction(once, { kind: 'go-to', label: 'Contact', section: 'contact' }).actions).toHaveLength(2);
  });

  it('prefers the server’s validated text on done, else what streamed', () => {
    expect(finalText(' streamed ', done())).toBe('streamed');
    expect(finalText('streamed [^project:nope]', done({ text: 'streamed ' }))).toBe('streamed');
    expect(finalText('streamed', done({ text: '   ' }))).toBe('streamed');
  });

  it('finishes the turn: clears status and streaming, keeps checks and provenance', () => {
    const checks = { figures: 2, names: 1, unverified: ['99%'], unverifiedNames: [], droppedRefs: 0 };
    const turn = finishTurn(live, 'final', done({ checks, unverified: ['99%'], degraded: true }));
    expect(turn).toMatchObject({ text: 'final', streaming: false, checks, provider: 'claude', unverified: ['99%'], degraded: true, retryable: true });
    expect(turn.status).toBeUndefined();
    expect(turn.sources).toBeUndefined();
    expect(turn.cached).toBeUndefined();
  });
});
