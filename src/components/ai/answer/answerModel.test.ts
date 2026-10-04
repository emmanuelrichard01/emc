import { describe, expect, it } from 'vitest';

import { checksLine, citationExcerpt, citationLabel, firstSentence, readAnswer, unverifiedMarks } from './answerModel';
import type { AnswerChecks } from '@/lib/aiProtocol';

const checks = (over: Partial<AnswerChecks> = {}): AnswerChecks => ({
  figures: 0,
  names: 0,
  unverified: [],
  unverifiedNames: [],
  droppedRefs: 0,
  ...over,
});

describe('checksLine', () => {
  it('says what was checked when everything was found', () => {
    expect(checksLine(checks({ figures: 4, names: 3 }))).toEqual({
      tone: 'ok',
      text: '4 figures and 3 names checked against the site',
    });
    expect(checksLine(checks({ figures: 1 })).text).toBe('1 figure checked against the site');
  });

  it('leads with what was not found', () => {
    expect(checksLine(checks({ figures: 3, unverified: ['99.9'], unverifiedNames: ['Kubernetes'] }))).toEqual({
      tone: 'warn',
      text: '1 figure and 1 name not found in the site’s data',
    });
  });

  it('mentions removed references', () => {
    expect(checksLine(checks({ figures: 2, droppedRefs: 1 })).text).toBe(
      '2 figures checked against the site, 1 broken reference removed'
    );
  });

  it('says nothing when nothing was checkable', () => {
    expect(checksLine(checks()).tone).toBe('none');
  });

  it('falls back to the legacy unverified list', () => {
    expect(checksLine(undefined, ['42', '7']).text).toBe('2 figures not found in the site’s data');
    expect(checksLine(undefined).tone).toBe('none');
  });
});

describe('citations', () => {
  it('names a citation for screen readers', () => {
    expect(citationLabel({ kind: 'project', id: 'mmr-engine', section: 'tradeoffs' }, 1)).toBe(
      'Source 1: MMR Engine, choices and trade-offs'
    );
  });

  it('excerpts the cited section from the data', () => {
    expect(citationExcerpt({ kind: 'project', id: 'mmr-engine', section: 'problem' }).length).toBeGreaterThan(20);
    expect(citationExcerpt({ kind: 'project', id: 'nope' })).toBe('');
  });

  it('cuts a passage to its first sentence', () => {
    expect(firstSentence('One thing happened here. Then another.')).toBe('One thing happened here.');
  });
});

describe('readAnswer', () => {
  it('drops references to projects that do not exist', () => {
    const doc = readAnswer('Real [^project:mmr-engine] and not [^project:imaginary].');
    expect(doc.citations).toEqual([{ kind: 'project', id: 'mmr-engine' }]);
  });

  it('marks figures and names together', () => {
    expect(unverifiedMarks(checks({ unverified: ['99.9'], unverifiedNames: ['Kubernetes'] }))).toEqual(['99.9', 'Kubernetes']);
  });
});
