import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { buildTour, TOUR_AUDIENCES, wordCount } from './aiTour';
import { sectionsFor } from './aiKnown';

describe('guided tour', () => {
  for (const { id: audience } of TOUR_AUDIENCES) {
    describe(audience, () => {
      const stops = buildTour(audience);

      it('has five to seven stops with unique ids', () => {
        expect(stops.length).toBeGreaterThanOrEqual(5);
        expect(stops.length).toBeLessThanOrEqual(7);
        expect(new Set(stops.map((s) => s.id)).size).toBe(stops.length);
      });

      it('points only at things that exist', () => {
        for (const { action } of stops) {
          if (action.kind === 'open-case') {
            const project = PROJECTS.find((p) => p.id === action.id);
            expect(project, action.id).toBeDefined();
            if (action.section) expect(sectionsFor(project!).has(action.section), `${action.id}#${action.section}`).toBe(true);
          }
          if (action.kind === 'open-role') expect(EXPERIENCE.some((r) => r.id === action.id)).toBe(true);
        }
      });

      it('has plain captions: no em-dashes, no blanks, at most 25 words', () => {
        for (const { caption } of stops) {
          expect(caption).not.toContain('—');
          expect(caption).not.toMatch(/undefined|NaN|: ,| {2}/);
          expect(wordCount(caption), caption).toBeLessThanOrEqual(25);
        }
      });

      it('ends on the contact section', () => {
        const last = stops[stops.length - 1].action;
        expect(last.kind === 'go-to' && last.section).toBe('contact');
      });
    });
  }

  it('takes its numbers from the data', () => {
    const mmr = PROJECTS.find((p) => p.id === 'mmr-engine')!;
    const tests = mmr.metrics.find((m) => m.label === 'Automated Tests')!.value;
    expect(buildTour('hiring').some((s) => s.caption.includes(tests))).toBe(true);
  });
});
