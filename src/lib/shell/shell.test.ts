import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { commonPrefix, complete, type CompletionContext } from './complete';
import { grep, head, sort, tail, uniq, wc } from './filters';
import { ROOT, displayPath, filterProjects, find, lookup, resolvePath, tree, walk } from './fs';
import { highlight } from './highlight';
import { getopt, lastSegment, parseLine, tokenize, type Word } from './parse';
import { buildRunLink, parseRunParam, withoutRunParam } from './runLink';
import { lines, type LinesOutput, type TableOutput } from './types';

/* ==========================================================================
   SHELL

   The parser, the virtual filesystem, the filters, completion and ?run=
   links: everything the terminal does that is not painting, tested as pure
   functions.
   ========================================================================== */

const w = (...values: string[]): Word[] => values.map((value) => ({ value, quoted: false, start: 0, end: 0 }));

function parsed(line: string) {
  const result = parseLine(line);
  if (!result.ok) throw new Error(`expected "${line}" to parse: ${result.error}`);
  return result.pipelines;
}

describe('parser', () => {
  it('splits words and keeps quoted text whole', () => {
    const [[cmd]] = parsed(`grep -i "rate limiter" 'two words'`).map((p) => p.commands);
    expect(cmd.name).toBe('grep');
    expect(cmd.words.map((x) => x.value)).toEqual(['-i', 'rate limiter', 'two words']);
    expect(cmd.words[1].quoted).toBe(true);
  });

  it('honours escapes, and keeps a backslash before an ordinary letter', () => {
    const lexed = tokenize('echo a\\ b "say \\"hi\\"" \\d');
    if (!lexed.ok) throw new Error(lexed.error);
    const words = lexed.tokens.flatMap((t) => (t.type === 'word' ? [t.word.value] : []));
    expect(words).toEqual(['echo', 'a b', 'say "hi"', '\\d']);
  });

  it('splits pipes and && into pipelines of commands', () => {
    const pipelines = parsed('cd projects && ls -l | grep redis | head -n 2');
    expect(pipelines.map((p) => p.commands.map((c) => c.name))).toEqual([['cd'], ['ls', 'grep', 'head']]);
  });

  it('does not split on | or && inside quotes', () => {
    const pipelines = parsed(`sql SELECT id FROM projects WHERE title LIKE '%a | b && c%'`);
    expect(pipelines).toHaveLength(1);
    expect(pipelines[0].commands).toHaveLength(1);
    expect(pipelines[0].commands[0].raw).toBe(`SELECT id FROM projects WHERE title LIKE '%a | b && c%'`);
  });

  it('keeps the exact text after the name for commands that need it', () => {
    const [[cmd]] = parsed(`sql   SELECT * FROM projects WHERE tier = 'design'  | wc -l`).map((p) => p.commands);
    expect(cmd.raw).toBe(`SELECT * FROM projects WHERE tier = 'design'`);
  });

  it('reports what it cannot parse', () => {
    expect(parseLine(`echo "open`)).toEqual({ ok: false, error: 'unterminated double quote' });
    expect(parseLine('ls |')).toMatchObject({ ok: false });
    expect(parseLine('&& ls')).toMatchObject({ ok: false });
    expect(parseLine('ls || pwd')).toMatchObject({ ok: false });
    expect(parseLine('ls & pwd')).toMatchObject({ ok: false });
  });

  it('reads flags of every shape', () => {
    expect(getopt(w('-l', '--stack=Redis', '--force', '-abc', 'path'))).toEqual({
      flags: { l: true, stack: 'Redis', force: true, a: true, b: true, c: true },
      args: ['path'],
    });
    expect(getopt(w('-n', '5', 'file'), ['n']).flags.n).toBe('5');
    expect(getopt(w('-n5'), ['n']).flags.n).toBe('5');
    expect(getopt(w('-5')).flags.n).toBe('5');
    expect(getopt(w('--name', 'x'), ['name']).flags.name).toBe('x');
    expect(getopt(w('--', '-v')).args).toEqual(['-v']);
    expect(getopt([{ value: '-v', quoted: true, start: 0, end: 0 }]).args).toEqual(['-v']);
  });

  it('finds the last command on a line, for completion', () => {
    expect(lastSegment('ls | gr').text).toBe('gr');
    expect(lastSegment('cd x && ca').text).toBe('ca');
    expect(lastSegment(`grep 'a|b' x`).text).toBe(`grep 'a|b' x`);
  });
});

describe('filesystem', () => {
  it('resolves every node it builds back to itself', () => {
    const nodes = walk();
    expect(nodes.length).toBeGreaterThan(PROJECTS.length * 2);
    for (const node of nodes) expect(lookup(node.path)).toBe(node);
  });

  it('lays out projects, careers, about and contact', () => {
    for (const project of PROJECTS) {
      const dir = lookup(`/projects/${project.id}`);
      expect(dir?.type).toBe('dir');
      expect(lookup(`/projects/${project.id}/readme`)?.type).toBe('file');
      expect(lookup(`/projects/${project.id}/stack`)?.type).toBe('file');
      // Only the files that exist: no empty `problem` without a case study.
      expect(Boolean(lookup(`/projects/${project.id}/problem`))).toBe(Boolean(project.caseStudy));
      expect(Boolean(lookup(`/projects/${project.id}/tradeoffs`))).toBe(Boolean(project.caseStudy?.tradeoffs?.length));
    }
    for (const role of EXPERIENCE) {
      for (const file of ['role', 'highlights', 'stack']) expect(lookup(`/career/${role.id}/${file}`)?.type).toBe('file');
    }
    expect(lookup('/about/principles')?.type).toBe('file');
    expect(lookup('/contact')?.type).toBe('file');
    expect(lookup('/projects/mmr-engine/code/matching.py')?.type).toBe('file');
  });

  it('resolves cd paths the way a shell does', () => {
    expect(resolvePath('/projects', 'mmr-engine')).toBe('/projects/mmr-engine');
    expect(resolvePath('/projects/mmr-engine', '..')).toBe('/projects');
    expect(resolvePath('/projects/mmr-engine', '../../career')).toBe('/career');
    expect(resolvePath('/', '..')).toBe('/');
    expect(resolvePath('/projects', '~')).toBe('/');
    expect(resolvePath('/projects', '')).toBe('/');
    expect(resolvePath('/career', '~/projects/')).toBe('/projects');
    expect(resolvePath('/career', '/about/./stack')).toBe('/about/stack');
    expect(resolvePath('/projects', './x/../y')).toBe('/projects/y');
  });

  it('prints home as ~', () => {
    expect(displayPath('/')).toBe('~');
    expect(displayPath('/projects/x')).toBe('~/projects/x');
  });

  it('looks up names case-insensitively and rejects paths through files', () => {
    expect(lookup('/Projects/MMR-Engine')?.path).toBe('/projects/mmr-engine');
    expect(lookup('/contact/x')).toBeNull();
    expect(lookup('/nope')).toBeNull();
  });

  it('draws a tree to a depth', () => {
    const shallow = tree(ROOT, 1);
    expect(shallow.lines[0]).toBe('~');
    expect(shallow.lines).toContain('├── projects/');
    expect(shallow.lines.some((l) => l.includes('mmr-engine'))).toBe(false);
    const deep = tree(ROOT, 2);
    expect(deep.lines.some((l) => l.includes('mmr-engine/'))).toBe(true);
  });

  it('finds by name glob and by content', () => {
    const py = find(ROOT, { name: '*.py' });
    expect(py.length).toBeGreaterThan(0);
    expect(py.every((n) => n.name.endsWith('.py'))).toBe(true);
    const stacks = find(lookup('/career')!, { name: 'stack' });
    expect(stacks).toHaveLength(EXPERIENCE.length);
    const tech = PROJECTS[0].stack[0];
    expect(find(ROOT, { grep: tech.toLowerCase() }).some((n) => n.path === `/projects/${PROJECTS[0].id}/stack`)).toBe(true);
  });

  it('filters projects by stack and tier, every filter holding', () => {
    const redis = filterProjects({ stack: 'redis' });
    expect(redis.length).toBeGreaterThan(0);
    expect(redis.every((p) => p.stack.some((s) => s.toLowerCase().includes('redis')))).toBe(true);
    expect(filterProjects({ tier: 'design' }).map((p) => p.id)).toEqual(PROJECTS.filter((p) => p.tier === 'design').map((p) => p.id));
    expect(filterProjects({ stack: 'redis,nonexistent-tech' })).toEqual([]);
  });
});

describe('filters', () => {
  const text = lines(['alpha', 'Beta', 'gamma', 'beta', 'beta']);
  const table: TableOutput = {
    kind: 'table',
    columns: ['id', 'n'],
    rows: [
      ['b', 10],
      ['a', 9],
      ['c', 100],
    ],
    runs: ['open b', 'open a', 'open c'],
  };
  const out = (r: { output: unknown }) => r.output as LinesOutput;

  it('grep matches, ignores case, inverts and counts, and exits 1 on no match', () => {
    expect(out(grep(w('beta'), text)).lines).toEqual(['beta', 'beta']);
    expect(out(grep(w('-i', 'beta'), text)).lines).toEqual(['Beta', 'beta', 'beta']);
    expect(out(grep(w('-v', 'a$'), text)).lines).toEqual([]);
    expect(out(grep(w('-c', 'beta'), text)).lines).toEqual(['2']);
    expect(grep(w('zzz'), text).status).toBe(1);
  });

  it('grep keeps a table a table, with its runs aligned', () => {
    const result = grep(w('c'), table).output as TableOutput;
    expect(result.kind).toBe('table');
    expect(result.rows).toEqual([['c', 100]]);
    expect(result.runs).toEqual(['open c']);
  });

  it('head and tail take -n', () => {
    expect(out(head(w('-n', '2'), text)).lines).toEqual(['alpha', 'Beta']);
    expect(out(tail(w('-n', '1'), text)).lines).toEqual(['beta']);
    expect(out(head(w('-2'), text)).lines).toEqual(['alpha', 'Beta']);
    expect(head(w('-n', 'x'), text).status).toBe(2);
  });

  it('sort orders a table by a named column, numbers as numbers, and reverses', () => {
    const byN = sort(w('-k', 'n'), table).output as TableOutput;
    expect(byN.rows.map((r) => r[0])).toEqual(['a', 'b', 'c']);
    expect(byN.runs).toEqual(['open a', 'open b', 'open c']);
    const reversed = sort(w('-r', '-k', 'n'), table).output as TableOutput;
    expect(reversed.rows.map((r) => r[1])).toEqual([100, 10, 9]);
    expect(sort(w('-k', 'nope'), table).status).toBe(2);
    expect(out(sort(w(), lines(['b', 'a', 'c']))).lines).toEqual(['a', 'b', 'c']);
    expect(out(sort(w('-n'), lines(['10', '9', '100']))).lines).toEqual(['9', '10', '100']);
  });

  it('uniq drops adjacent repeats and counts them', () => {
    expect(out(uniq(w(), text)).lines).toEqual(['alpha', 'Beta', 'gamma', 'beta']);
    expect(out(uniq(w('-c'), text)).lines[3]).toBe('   2 beta');
  });

  it('wc counts lines, words and characters', () => {
    expect(out(wc(w('-l'), text)).lines).toEqual(['5']);
    expect(out(wc(w('-w'), lines(['a b', 'c']))).lines).toEqual(['3']);
    expect(out(wc(w('-l'), table)).lines).toEqual(['3']);
  });
});

describe('completion', () => {
  const ctx: CompletionContext = {
    commands: [
      { name: 'cat', arg: 'target' },
      { name: 'cd', arg: 'dir' },
      { name: 'clear' },
      { name: 'grep', arg: 'path' },
      { name: 'ls', arg: 'path', flags: [{ name: '-l' }, { name: '--stack', values: 'tech' }, { name: '--tier', values: 'tier' }] },
      { name: 'man', arg: 'command' },
      { name: 'theme', arg: 'theme' },
      { name: 'sql', arg: 'sql' },
    ],
    cwd: '/',
    themes: ['amber', 'purple'],
    sqlUnlocked: false,
  };
  const values = (line: string, over: Partial<CompletionContext> = {}) => complete(line, { ...ctx, ...over }).candidates.map((c) => c.value);

  it('completes command names, including after a pipe', () => {
    expect(values('c')).toEqual(['cat', 'cd', 'clear']);
    expect(values('ls | gr')).toEqual(['grep']);
  });

  it('completes paths relative to the working directory', () => {
    expect(values('cd pro')).toEqual(['projects/']);
    expect(values('cat /projects/mmr-engine/tr')).toEqual(['/projects/mmr-engine/tradeoffs']);
    expect(values('cat tr', { cwd: '/projects/mmr-engine' })).toEqual(['tradeoffs']);
    expect(values('cd ..', { cwd: '/projects' })).toContain('../');
  });

  it('offers directories only to cd', () => {
    expect(values('cd ', { cwd: '/projects/mmr-engine' }).every((v) => v.endsWith('/'))).toBe(true);
    expect(values('cat ', { cwd: '/projects/mmr-engine' })).toContain('readme');
  });

  it('offers project ids from anywhere for cat and open', () => {
    expect(values('cat mmr', { cwd: '/career' })).toEqual(['mmr-engine']);
  });

  it('completes flags and their values', () => {
    expect(values('ls --st')).toEqual(['--stack=']);
    expect(values('ls --tier=de')).toEqual(['--tier=design']);
    expect(values('ls --stack=Redis,Py').every((v) => v.startsWith('--stack=Redis,Py'))).toBe(true);
  });

  it('completes commands for man, and themes', () => {
    expect(values('man gr')).toEqual(['grep']);
    expect(values('theme p')).toEqual(['purple']);
  });

  it('offers SQL only once unlocked, with columns of the named table', () => {
    expect(values('sql SELECT ti')).toEqual([]);
    const unlocked = values('sql SELECT ti', { sqlUnlocked: true });
    expect(unlocked).toContain('tier');
    expect(unlocked).toContain('title');
    expect(values('SELECT id FROM pro', { sqlUnlocked: true })).toEqual(['projects']);
    // Columns of the named table come first, then keywords.
    const where = values('sql SELECT * FROM experience WHERE co', { sqlUnlocked: true });
    expect(where[0]).toBe('company');
    expect(where).not.toContain('category');
  });

  it('finds the shared prefix for Tab to extend to', () => {
    expect(commonPrefix(['projects/', 'project-x'])).toBe('project');
    expect(commonPrefix([])).toBe('');
  });
});

describe('?run= links', () => {
  it('reads the command, trimmed and on one line', () => {
    expect(parseRunParam('?run=ls%20-l')).toBe('ls -l');
    expect(parseRunParam('?x=1&run=cat%20mmr-engine%0Arm')).toBe('cat mmr-engine rm');
  });

  it('ignores a missing, empty or oversized command', () => {
    expect(parseRunParam('')).toBeNull();
    expect(parseRunParam('?run=')).toBeNull();
    expect(parseRunParam(`?run=${'a'.repeat(301)}`)).toBeNull();
  });

  it('round-trips through the link share builds', () => {
    const line = `ls /projects --stack=Redis | grep -i 'rate limiter'`;
    const link = buildRunLink('https://example.com/', line);
    expect(link.startsWith('https://example.com/?run=')).toBe(true);
    expect(parseRunParam(new URL(link).search)).toBe(line);
  });

  it('removes only its own parameter', () => {
    expect(withoutRunParam('?run=ls&x=1')).toBe('?x=1');
    expect(withoutRunParam('?run=ls')).toBe('');
  });
});

describe('highlighter', () => {
  it('colours keywords, strings, comments and numbers', () => {
    const kinds = (code: string, lang: string) => highlight(code, lang).filter((t) => t.kind !== 'plain').map((t) => `${t.kind}:${t.text}`);
    expect(kinds("def f(x):  # note\n    return 'a' + 1", 'python')).toEqual([
      'keyword:def',
      'function:f',
      'comment:# note',
      'keyword:return',
      "string:'a'",
      'number:1',
    ]);
    expect(kinds('SELECT id FROM t -- why', 'sql')).toEqual(['keyword:SELECT', 'keyword:FROM', 'comment:-- why']);
    expect(highlight('x', 'cobol')).toEqual([{ text: 'x', kind: 'plain' }]);
  });
});
