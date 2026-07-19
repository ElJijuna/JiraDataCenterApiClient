import { tokenizeJql, type JqlToken } from './JqlLexer';

/** Options for {@link formatJql}. */
export interface JqlFormatOptions {
  /**
   * When `true`, top-level `AND` / `OR` connectors and the `ORDER BY` clause
   * each start on a new line.
   * @default false
   */
  multiline?: boolean;
}

/** Keywords normalized to uppercase by {@link formatJql}. All are JQL-reserved, so bare use as a value is invalid anyway. */
const KEYWORDS = new Set([
  'and', 'or', 'not', 'in', 'is', 'was', 'changed', 'empty', 'null',
  'order', 'by', 'asc', 'desc', 'on', 'before', 'after', 'during', 'from', 'to',
]);

/** @internal */
function normalizeWord(token: JqlToken): string {
  return KEYWORDS.has(token.value.toLowerCase()) ? token.value.toUpperCase() : token.value;
}

/** @internal */
function isWordKeyword(token: JqlToken, keyword: string): boolean {
  return token.type === 'word' && token.value.toLowerCase() === keyword;
}

/**
 * Normalizes a JQL query: single spacing, uppercase keywords (`AND`, `OR`,
 * `IN`, `ORDER BY`, …), tidy lists (`(a, b)`), and function calls kept
 * attached to their parentheses. String literals are preserved exactly.
 *
 * @param query - The JQL query text
 * @param options - Formatting options
 * @returns The formatted query
 * @throws {TypeError} If the query cannot be tokenized (e.g. unterminated string)
 *
 * @example
 * ```typescript
 * formatJql('project=OPS and status in("Open","Reopened")order by updated desc');
 * // project = OPS AND status IN ("Open", "Reopened") ORDER BY updated DESC
 *
 * formatJql('a = 1 and b = 2 order by a', { multiline: true });
 * // a = 1
 * // AND b = 2
 * // ORDER BY a
 * ```
 */
export function formatJql(query: string, options: JqlFormatOptions = {}): string {
  const tokens = tokenizeJql(query);
  const firstError = tokens.find((token) => token.type === 'error');
  if (firstError) {
    throw new TypeError(`Cannot format invalid JQL: ${firstError.message ?? 'unexpected input'}`);
  }

  const multiline = options.multiline === true;
  let output = '';
  let depth = 0;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const prev = tokens[i - 1];

    let separator = ' ';
    if (prev === undefined) {
      separator = '';
    } else if (token.type === 'rparen' || token.type === 'comma') {
      separator = '';
    } else if (prev.type === 'lparen') {
      separator = '';
    } else if (token.type === 'lparen' && prev.type === 'word' && prev.end === token.start && !KEYWORDS.has(prev.value.toLowerCase())) {
      // Function call: keep `openSprints(` attached, unlike list parens after IN/NOT.
      separator = '';
    } else if (multiline && depth === 0) {
      if (isWordKeyword(token, 'and') || isWordKeyword(token, 'or')) {
        separator = '\n';
      } else if (isWordKeyword(token, 'order') && isWordKeyword(tokens[i + 1] ?? token, 'by')) {
        separator = '\n';
      }
    }

    if (token.type === 'lparen') depth += 1;
    if (token.type === 'rparen') depth = Math.max(0, depth - 1);

    const text = token.type === 'word' ? normalizeWord(token) : token.value;
    output += separator + text;
  }

  return output;
}
