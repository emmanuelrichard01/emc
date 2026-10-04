/* ==========================================================================
   CODE HIGHLIGHTER

   Small and hand-rolled on purpose: three languages (python, ts, sql), five
   kinds of token, one pass. The excerpts on this site are a few dozen lines
   each, so a library would weigh more than everything it colours.

   Unknown languages come back as one plain token, which is the honest
   fallback: uncoloured text is never wrong.
   ========================================================================== */

export type TokenKind = 'plain' | 'keyword' | 'string' | 'comment' | 'number' | 'function';

export interface CodeToken {
  text: string;
  kind: TokenKind;
}

const PYTHON = new Set(
  'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self'.split(' ')
);
const TS = new Set(
  'abstract any as async await boolean break case catch class const continue default delete do else enum export extends false finally for from function if implements import in instanceof interface let new null number of private protected public readonly return static string super switch this throw true try type typeof undefined var void while yield'.split(' ')
);
const SQL = new Set(
  'select from where and or not in like is null as on join left right inner outer group by order having limit offset distinct count sum avg min max asc desc insert into values update set delete create table index primary key references with case when then else end union all exists between true false'.split(' ')
);

interface Grammar {
  keywords: Set<string>;
  caseInsensitive: boolean;
  lineComment: string[];
  blockComment?: [string, string];
  strings: string[];
}

const GRAMMARS: Record<string, Grammar> = {
  python: { keywords: PYTHON, caseInsensitive: false, lineComment: ['#'], strings: ['"""', "'''", '"', "'"] },
  ts: { keywords: TS, caseInsensitive: false, lineComment: ['//'], blockComment: ['/*', '*/'], strings: ['`', '"', "'"] },
  sql: { keywords: SQL, caseInsensitive: true, lineComment: ['--'], blockComment: ['/*', '*/'], strings: ["'"] },
};

const ALIASES: Record<string, string> = { py: 'python', typescript: 'ts', tsx: 'ts', javascript: 'ts', js: 'ts', jsx: 'ts' };

export function grammarFor(lang: string): Grammar | null {
  const key = lang.toLowerCase();
  return GRAMMARS[ALIASES[key] ?? key] ?? null;
}

export function highlight(code: string, lang: string): CodeToken[] {
  const grammar = grammarFor(lang);
  if (!grammar) return [{ text: code, kind: 'plain' }];

  const tokens: CodeToken[] = [];
  const push = (text: string, kind: TokenKind) => {
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind) last.text += text;
    else tokens.push({ text, kind });
  };

  let i = 0;
  while (i < code.length) {
    const rest = code.slice(i);

    const line = grammar.lineComment.find((c) => rest.startsWith(c));
    if (line) {
      const end = code.indexOf('\n', i);
      const stop = end === -1 ? code.length : end;
      push(code.slice(i, stop), 'comment');
      i = stop;
      continue;
    }

    if (grammar.blockComment && rest.startsWith(grammar.blockComment[0])) {
      const end = code.indexOf(grammar.blockComment[1], i + grammar.blockComment[0].length);
      const stop = end === -1 ? code.length : end + grammar.blockComment[1].length;
      push(code.slice(i, stop), 'comment');
      i = stop;
      continue;
    }

    const quote = grammar.strings.find((q) => rest.startsWith(q));
    if (quote) {
      let j = i + quote.length;
      while (j < code.length && !code.startsWith(quote, j)) {
        if (code[j] === '\\') j++;
        // A single-quoted string ends at the line; only triple quotes and backticks span lines.
        if (quote.length === 1 && quote !== '`' && code[j] === '\n') break;
        j++;
      }
      const stop = code.startsWith(quote, j) ? j + quote.length : j;
      push(code.slice(i, stop), 'string');
      i = stop;
      continue;
    }

    const number = /^(0x[\da-f]+|\d[\d_]*(\.\d+)?)/i.exec(rest);
    if (number && !/[\w$]/.test(code[i - 1] ?? '')) {
      push(number[0], 'number');
      i += number[0].length;
      continue;
    }

    const word = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (word) {
      const text = word[0];
      const key = grammar.caseInsensitive ? text.toLowerCase() : text;
      const after = code.slice(i + text.length).match(/^\s*\(/);
      push(text, grammar.keywords.has(key) ? 'keyword' : after ? 'function' : 'plain');
      i += text.length;
      continue;
    }

    push(code[i], 'plain');
    i++;
  }
  return tokens;
}
