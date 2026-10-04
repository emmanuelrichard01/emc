import { describe, expect, it } from 'vitest';

import { COMMAND_REFERENCE } from '@/lib/shell/manual';
import { buildCommands, type CommandDeps } from './useConsoleCommands';

/* The `?` helper only knows the commands its reference names, so a command
   added to the registry without a line in the reference could never be
   proposed. This keeps the two in step. */

const noop = () => {};

function registry(unlocked: boolean) {
  const deps: CommandDeps = {
    navigate: noop as unknown as CommandDeps['navigate'],
    setTheme: noop,
    unlocked,
    unlock: noop,
    relock: noop,
    clearSession: noop,
    getHistory: () => [],
    markAnnounced: noop,
    setCwd: noop,
    getPrevCwd: () => '/',
    getLastStatus: () => 0,
    getLastLine: () => null,
    enterAi: noop,
  };
  return buildCommands(deps);
}

describe('command reference', () => {
  it('mentions every command a visitor can run', () => {
    const names = registry(true)
      .filter((spec) => !spec.hidden)
      .map((spec) => spec.name);
    const missing = names.filter((name) => !new RegExp(`(^|\\s)${name.replace(/\\/g, '\\\\')}(\\s|$)`, 'm').test(COMMAND_REFERENCE));
    expect(missing).toEqual([]);
  });

  it('gives every visible command a topic and a summary, for help', () => {
    for (const spec of registry(true).filter((s) => !s.hidden)) {
      expect(spec.summary.length).toBeGreaterThan(0);
      expect(['navigate', 'read', 'search', 'ask', 'site', 'query']).toContain(spec.topic);
    }
  });

  it('has no duplicate names', () => {
    const names = registry(true).map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
