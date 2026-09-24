import { describe, expect, it } from 'vitest';

import { readEvents, type AiEvent } from './aiStream';

/** A body delivered in exactly these byte chunks. */
function body(chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      controller.close();
    },
  });
}

async function collect(chunks: (string | Uint8Array)[]): Promise<AiEvent[]> {
  const events: AiEvent[] = [];
  await readEvents(body(chunks), (event) => events.push(event));
  return events;
}

describe('readEvents', () => {
  it('parses one event per line', async () => {
    const events = await collect(['{"type":"delta","text":"a"}\n{"type":"done"}\n']);
    expect(events).toEqual([{ type: 'delta', text: 'a' }, { type: 'done' }]);
  });

  it('reassembles a line split across chunks', async () => {
    const events = await collect(['{"type":"del', 'ta","text":"hel', 'lo"}\n']);
    expect(events).toEqual([{ type: 'delta', text: 'hello' }]);
  });

  it('reassembles a multi-byte character split across chunks', async () => {
    const bytes = new TextEncoder().encode('{"type":"delta","text":"—"}\n');
    const cut = bytes.indexOf(0xe2) + 1; // inside the em dash
    const events = await collect([bytes.slice(0, cut), bytes.slice(cut)]);
    expect(events).toEqual([{ type: 'delta', text: '—' }]);
  });

  it('reads a final line with no trailing newline', async () => {
    expect(await collect(['{"type":"done"}'])).toEqual([{ type: 'done' }]);
  });

  it('skips a malformed line without losing its neighbours', async () => {
    const events = await collect(['{"type":"delta","text":"a"}\nnot json\n{"type":"done"}\n']);
    expect(events.map((e) => e.type)).toEqual(['delta', 'done']);
  });
});
