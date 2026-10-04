import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { CAPABILITIES } from './capabilities';

const byId = new Map(PROJECTS.map((p) => [p.id, p]));

describe('capabilities', () => {
  it('lists only built projects that exist', () => {
    for (const cap of CAPABILITIES) {
      for (const { id } of cap.projects) {
        const project = byId.get(id);
        expect(project, `${cap.id}: no project "${id}"`).toBeDefined();
        expect(project!.tier, `${cap.id}: ${id} is a design study`).not.toBe('design');
      }
    }
  });

  it("backs every listing with words from the project's own data", () => {
    for (const cap of CAPABILITIES) {
      for (const { id, proof } of cap.projects) {
        const text = JSON.stringify(byId.get(id)).toLowerCase();
        expect(text.includes(proof.toLowerCase()), `${cap.id}: "${proof}" is not in ${id}`).toBe(true);
      }
    }
  });

  it('shows at least two projects per capability, each once', () => {
    for (const cap of CAPABILITIES) {
      const ids = cap.projects.map((p) => p.id);
      expect(ids.length, cap.id).toBeGreaterThanOrEqual(2);
      expect(new Set(ids).size, cap.id).toBe(ids.length);
    }
  });

  it('writes no em-dashes in visible text', () => {
    for (const cap of CAPABILITIES) expect(`${cap.title} ${cap.gist}`).not.toMatch(/—/);
  });
});
