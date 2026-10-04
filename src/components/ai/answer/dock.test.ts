import { describe, expect, it } from 'vitest';

import { locateQuote } from './highlight';
import { activeMention, insertMention, matchMentions, mentionCandidates, stillMentions } from './mentions';
import { settleSheet, snapHeight, stepSnap } from './sheetSnap';

describe('mentions', () => {
  it('finds the @word at the caret, and only at a word start', () => {
    expect(activeMention('how does @mm', 12)).toEqual({ start: 9, query: 'mm' });
    expect(activeMention('@', 1)).toEqual({ start: 0, query: '' });
    expect(activeMention('mail me@home', 12)).toBeNull();
    expect(activeMention('@mmr engine', 11)).toBeNull();
  });

  it('ranks projects and roles by name', () => {
    expect(matchMentions('mmr')[0]).toMatchObject({ kind: 'project', id: 'mmr-engine' });
    expect(matchMentions('merc')[0]).toMatchObject({ kind: 'role', label: 'Mercor' });
    expect(matchMentions('').length).toBeGreaterThan(0);
    expect(matchMentions('zzzzqqq')).toEqual([]);
  });

  it('writes "@Title " in place of what was typed, and keeps the rest', () => {
    const mmr = mentionCandidates().find((m) => m.id === 'mmr-engine')!;
    const out = insertMention('how does @mm work?', 12, 9, mmr);
    expect(out.text).toBe('how does @MMR Engine work?');
    expect(out.caret).toBe('how does @MMR Engine '.length);
    expect(stillMentions(out.text, mmr)).toBe(true);
    expect(stillMentions('how does it work?', mmr)).toBe(false);
  });
});

describe('sheet snap points', () => {
  const vh = 800;
  it('settles at the nearest snap, thrown by the flick', () => {
    expect(settleSheet(snapHeight('half', vh) + 10, 0, vh)).toBe('half');
    expect(settleSheet(snapHeight('half', vh), -2000, vh)).toBe('full');
    expect(settleSheet(snapHeight('half', vh), 1200, vh)).toBe('peek');
  });
  it('closes when dragged well below the peek', () => {
    expect(settleSheet(snapHeight('peek', vh) - 120, 0, vh)).toBe('close');
    expect(settleSheet(snapHeight('peek', vh) - 20, 0, vh)).toBe('peek');
  });
  it('steps one snap at a time, clamped', () => {
    expect(stepSnap('peek', 1)).toBe('half');
    expect(stepSnap('full', 1)).toBe('full');
    expect(stepSnap('peek', -1)).toBe('peek');
  });
});

describe('locateQuote', () => {
  const page = 'The matcher runs in  two passes.\nFirst, a cheap “blocking” step — then the expensive one.';
  it('forgives case, whitespace, curly quotes and dashes', () => {
    const at = locateQuote(page, 'the matcher runs in two passes')!;
    expect(page.slice(at.start, at.end)).toBe('The matcher runs in  two passes');
    const q = locateQuote(page, 'a cheap "blocking" step - then')!;
    expect(page.slice(q.start, q.end)).toBe('a cheap “blocking” step — then');
  });
  it('falls back to the opening words of a loosely quoted sentence', () => {
    const at = locateQuote(page, 'First, a cheap “blocking” step, then a costly one that differs');
    expect(at).not.toBeNull();
    expect(page.slice(at!.start, at!.end).startsWith('First, a cheap')).toBe(true);
  });
  it('gives up on quotes that are not there or too short', () => {
    expect(locateQuote(page, 'nothing like this sentence at all')).toBeNull();
    expect(locateQuote(page, 'the')).toBeNull();
  });
});
