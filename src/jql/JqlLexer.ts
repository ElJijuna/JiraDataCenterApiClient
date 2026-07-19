/** Kind of a token produced by {@link tokenizeJql}. */
export type JqlTokenType =
  | 'string'
  | 'number'
  | 'word'
  | 'operator'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'error';

/** A single token of a JQL query, with its raw text and position. */
export interface JqlToken {
  /** The token kind */
  type: JqlTokenType;
  /** The raw text slice of the token, exactly as it appears in the query */
  value: string;
  /** Zero-based start offset in the query */
  start: number;
  /** Zero-based end offset (exclusive) in the query */
  end: number;
  /** Human-readable problem description, only present on `error` tokens */
  message?: string;
}

const COMPARISON_OPERATORS = ['!=', '!~', '<=', '>=', '=', '~', '<', '>'];
/** Characters that terminate a bare word. `[` and `]` stay inside words so `cf[10010]` is one token. */
const WORD_TERMINATORS = new Set([' ', '\t', '\n', '\r', '"', "'", '=', '!', '~', '<', '>', '(', ')', ',']);

/**
 * Splits a JQL query into tokens. Never throws: lexical problems
 * (unterminated strings, stray characters) are reported as `error` tokens
 * with a `message`, so linting can surface them with positions.
 *
 * @param query - The JQL query text
 * @returns The token list, in source order
 */
export function tokenizeJql(query: string): JqlToken[] {
  const tokens: JqlToken[] = [];
  let index = 0;

  while (index < query.length) {
    const char = query[index];

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const start = index;
      index += 1;
      let closed = false;
      while (index < query.length) {
        if (query[index] === '\\') {
          index += 2;
          continue;
        }
        if (query[index] === char) {
          index += 1;
          closed = true;
          break;
        }
        index += 1;
      }
      const end = Math.min(index, query.length);
      if (closed) {
        tokens.push({ type: 'string', value: query.slice(start, end), start, end });
      } else {
        tokens.push({
          type: 'error',
          value: query.slice(start, query.length),
          start,
          end: query.length,
          message: `Unterminated string starting at position ${start}`,
        });
        index = query.length;
      }
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen', value: '(', start: index, end: index + 1 });
      index += 1;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'rparen', value: ')', start: index, end: index + 1 });
      index += 1;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'comma', value: ',', start: index, end: index + 1 });
      index += 1;
      continue;
    }

    const operator = COMPARISON_OPERATORS.find((op) => query.startsWith(op, index));
    if (operator) {
      tokens.push({ type: 'operator', value: operator, start: index, end: index + operator.length });
      index += operator.length;
      continue;
    }

    if (char === '!') {
      tokens.push({
        type: 'error',
        value: '!',
        start: index,
        end: index + 1,
        message: `Unexpected character "!" at position ${index} (expected "!=" or "!~")`,
      });
      index += 1;
      continue;
    }

    const start = index;
    while (index < query.length && !WORD_TERMINATORS.has(query[index])) {
      index += 1;
    }
    const value = query.slice(start, index);
    const type: JqlTokenType = /^-?\d+(\.\d+)?$/.test(value) ? 'number' : 'word';
    tokens.push({ type, value, start, end: index });
  }

  return tokens;
}
