import { describe, expect, it } from 'vitest';

import { fitDraft, fitTally, fitText } from './aiFit';
import { briefDraft, briefText } from './aiBrief';
import type { BriefResult, FitResult } from './aiProtocol';

const fit: FitResult = {
  role: 'Senior Data Engineer',
  summary: 'Strong on pipelines and payments. Cloud certifications are not shown.',
  rejectedEvidence: 0,
  requirements: [
    {
      requirement: 'Event-driven pipelines',
      verdict: 'strong',
      note: 'Several shipped systems stream events.',
      evidence: [{ kind: 'project', id: 'mmr-engine', section: 'approach', quote: 'Redpanda' }],
    },
    { requirement: 'dbt', verdict: 'partial', note: 'Used in one warehouse.', evidence: [] },
    { requirement: 'AWS certification', verdict: 'not-shown', note: 'Not on the site.', evidence: [] },
  ],
};

const brief: BriefResult = {
  title: 'Payments reconciliation for a marketplace',
  goal: 'Stop reconciling by hand.',
  currentState: 'Two PSPs and a spreadsheet.',
  outcomes: ['Daily matched report', 'Alerts on mismatches'],
  constraints: ['Paystack and Flutterwave'],
  timeline: 'Q1',
  relevantWork: [{ id: 'mmr-engine', why: 'Same problem, solved end to end.' }],
  openQuestions: ['How many transactions a day?'],
};

describe('role fit text', () => {
  it('tallies verdicts, leaving out zeros', () => {
    expect(fitTally(fit.requirements)).toBe('1 strong, 1 partial, 1 not shown');
    expect(fitTally(fit.requirements.slice(0, 1))).toBe('1 strong');
  });

  it('copies every requirement with its evidence', () => {
    const text = fitText(fit);
    expect(text).toContain('Strong: Event-driven pipelines');
    expect(text).toContain('MMR Engine, how it works: "Redpanda"');
    expect(text).toContain('Not shown on this site: AWS certification');
  });

  it('keeps the message draft under 1500 characters and free of em-dashes', () => {
    const many: FitResult = { ...fit, requirements: Array.from({ length: 60 }, (_, i) => ({ ...fit.requirements[0], requirement: `Requirement number ${i} with a long description` })) };
    const draft = fitDraft(many);
    expect(draft.length).toBeLessThanOrEqual(1500);
    expect(draft).toContain('(more in the full check)');
    expect(fitDraft(fit)).not.toContain('—');
  });
});

describe('project brief text', () => {
  it('names the past work by title and keeps every section', () => {
    const text = briefText(brief);
    expect(text).toContain('Project brief: Payments reconciliation');
    expect(text).toContain('MMR Engine: Same problem');
    expect(text).toContain('Open questions\n- How many transactions a day?');
  });

  it('drops empty sections and fits the contact message', () => {
    const sparse = briefText({ ...brief, constraints: [], timeline: '' });
    expect(sparse).not.toContain('Constraints');
    expect(sparse).not.toContain('Timeline');
    const long = briefDraft({ ...brief, goal: 'x '.repeat(3000) });
    expect(long.length).toBeLessThanOrEqual(2000);
  });
});
