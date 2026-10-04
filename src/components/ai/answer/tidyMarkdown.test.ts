import { describe, expect, it } from 'vitest';

import { readAnswer, tidyMarkdown } from './answerModel';

describe('tidyMarkdown', () => {
  it('leaves house markup alone', () => {
    const house = 'It reconciles nightly.\n\n- one\n- two';
    expect(tidyMarkdown(house)).toBe(house);
  });

  it('turns headings into bold lines and * / 1. bullets into "- "', () => {
    const doc = readAnswer('### 4. Choosing a queue\n* **Chosen:** Redpanda\n* **Rejected:** Kafka\n\n1. first\n2. second');
    expect(doc.nodes.map((n) => n.type)).toEqual(['p', 'list', 'list']);
    const list = doc.nodes[1];
    expect(list.type === 'list' && list.items.length).toBe(2);
  });

  it('splits a list from the sentence right above it', () => {
    const doc = readAnswer('Two choices stand out:\n- Redpanda over Kafka\n- Postgres over Mongo');
    expect(doc.nodes.map((n) => n.type)).toEqual(['p', 'list']);
  });
});
