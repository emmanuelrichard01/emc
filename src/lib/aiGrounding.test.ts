import { describe, expect, it } from 'vitest';

import { unverifiedFigures } from './aiGrounding';

describe('unverifiedFigures', () => {
  const evidence = ['Automated Tests: 4,076; Move @500 Objects: ~5.7ms', 'Auto-Match Target: 99.5%', '(5 rows)'];

  it('passes figures that appear in the evidence, however they are grouped', () => {
    expect(unverifiedFigures('4,076 tests, 4076 in all, about 5.7ms per move', evidence)).toEqual([]);
  });

  it('flags a figure the evidence never contained', () => {
    expect(unverifiedFigures('it matches 99.9% of transactions', evidence)).toEqual(['99.9']);
  });

  it('reads a count the model got from a result set', () => {
    expect(unverifiedFigures('5 projects are live', evidence)).toEqual([]);
  });

  it('treats trailing zeros and separators as the same number', () => {
    expect(unverifiedFigures('99.50%', evidence)).toEqual([]);
    expect(unverifiedFigures('4,076,', evidence)).toEqual([]);
  });

  it('ignores numbers fused to names, not claims', () => {
    expect(unverifiedFigures('built on S3 with gemini-3.5 and ULTRA-NEWS V3', [])).toEqual([]);
  });

  it('ignores list numbering', () => {
    expect(unverifiedFigures('1. first\n2. second', [])).toEqual([]);
  });

  it('reports each unverified figure once', () => {
    expect(unverifiedFigures('42 then 42 again', [])).toEqual(['42']);
  });
});
