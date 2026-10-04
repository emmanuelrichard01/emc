import { describe, expect, it } from 'vitest';

import { answerToPlainText, holdBackPartial, parseAnswer, stripMarkup, validateAnswer, type KnownRefs } from './aiAnswer';
import type { CaseSectionId } from './aiProtocol';

const known: KnownRefs = {
  projects: new Map<string, ReadonlySet<CaseSectionId>>([
    ['mmr-engine', new Set<CaseSectionId>(['problem', 'approach', 'outcome', 'tradeoffs', 'field-notes'])],
    ['vega-canva', new Set<CaseSectionId>(['problem', 'approach', 'outcome', 'tradeoffs'])],
    ['evanty', new Set<CaseSectionId>(['overview'])],
  ]),
  roles: new Set(['medvax']),
  withCode: new Set(['mmr-engine']),
  withDiagram: new Set(['mmr-engine', 'vega-canva']),
};

describe('parseAnswer', () => {
  it('reads paragraphs, bullets, bold and blocks', () => {
    const doc = parseAnswer(
      'MMR Engine matches payments **once** [^project:mmr-engine#tradeoffs].\n\n- one\n- two [^role:medvax]\n\n{{compare:mmr-engine,vega-canva}}'
    );
    expect(doc.nodes.map((n) => n.type)).toEqual(['p', 'list', 'block']);
    const p = doc.nodes[0];
    expect(p.type === 'p' && p.inlines.some((i) => i.type === 'text' && i.strong && i.text === 'once')).toBe(true);
    expect(doc.citations).toEqual([
      { kind: 'project', id: 'mmr-engine', section: 'tradeoffs' },
      { kind: 'role', id: 'medvax' },
    ]);
  });

  it('reads a grouped citation and an unknown section without leaking markup', () => {
    const doc = parseAnswer('once [^project:mmr-engine#highlights] and [^project:vega-canva, ^role:mercor].');
    expect(doc.citations).toEqual([
      { kind: 'project', id: 'mmr-engine' },
      { kind: 'project', id: 'vega-canva' },
      { kind: 'role', id: 'mercor' },
    ]);
    expect(stripMarkup('once [^project:mmr-engine#highlights] and [^project:a, ^role:b].')).toBe('once  and .');
  });

  it('numbers a repeated citation once', () => {
    const doc = parseAnswer('a [^project:mmr-engine] b [^project:mmr-engine]');
    expect(doc.citations).toHaveLength(1);
    const p = doc.nodes[0];
    expect(p.type === 'p' && p.inlines.filter((i) => i.type === 'cite').map((i) => (i.type === 'cite' ? i.n : 0))).toEqual([1, 1]);
  });

  it('keeps a directive written mid-sentence as text', () => {
    const doc = parseAnswer('see {{project:mmr-engine}} here');
    expect(doc.nodes[0].type).toBe('p');
  });
});

describe('holdBackPartial', () => {
  it('hides an unfinished citation, block or bold', () => {
    expect(holdBackPartial('claim [^proj')).toBe('claim ');
    expect(holdBackPartial('{{compa')).toBe('');
    expect(holdBackPartial('a **bold')).toBe('a ');
    expect(holdBackPartial('done [^role:medvax]')).toBe('done [^role:medvax]');
  });
});

describe('validateAnswer', () => {
  it('drops references to things that do not exist and renumbers', () => {
    const doc = parseAnswer('x [^project:nope] y [^project:vega-canva#field-notes] z [^role:ghost]\n\n{{code:vega-canva}}\n\n{{project:mmr-engine}}');
    const { doc: valid, dropped } = validateAnswer(doc, known);
    expect(dropped).toBe(3);
    // A section the project does not have is removed; the project stays.
    expect(valid.citations).toEqual([{ kind: 'project', id: 'vega-canva' }]);
    expect(valid.nodes.filter((n) => n.type === 'block')).toHaveLength(1);
  });

  it('needs two real projects to compare', () => {
    const { doc, dropped } = validateAnswer(parseAnswer('{{compare:mmr-engine,nope}}'), known);
    expect(doc.nodes).toHaveLength(0);
    expect(dropped).toBe(1);
  });
});

describe('plain text', () => {
  it('turns citations into numbers and lists them', () => {
    const doc = parseAnswer('It matches once [^project:mmr-engine#tradeoffs].');
    expect(answerToPlainText(doc, () => 'MMR Engine')).toBe('It matches once [1].\n\n[1] MMR Engine, tradeoffs');
  });

  it('strips markup for the audit', () => {
    expect(stripMarkup('**276** tests [^project:mmr-engine]\n{{project:mmr-engine}}')).toBe('276 tests \n');
  });
});
