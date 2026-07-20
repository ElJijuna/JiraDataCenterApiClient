import { JqlRaw } from './JqlRaw';

/**
 * A value usable on the right-hand side of a JQL comparison:
 * strings are quoted and escaped, numbers are inserted bare, `Date`s are
 * formatted as `"yyyy-MM-dd HH:mm"`, and {@link JqlRaw} fragments
 * (including JQL function calls) are inserted verbatim.
 */
export type JqlOperand = string | number | Date | JqlRaw;

/**
 * Words reserved by JQL. Field names or bare values matching one of these
 * must be quoted. Mirrors the reserved-word list documented for
 * Jira Data Center advanced searching.
 */
export const JQL_RESERVED_WORDS: ReadonlySet<string> = new Set([
  'abort',
  'access',
  'add',
  'after',
  'alias',
  'all',
  'alter',
  'and',
  'any',
  'as',
  'asc',
  'audit',
  'avg',
  'before',
  'begin',
  'between',
  'boolean',
  'break',
  'by',
  'byte',
  'catch',
  'cf',
  'char',
  'character',
  'check',
  'checkpoint',
  'collate',
  'collation',
  'column',
  'commit',
  'connect',
  'continue',
  'count',
  'create',
  'current',
  'date',
  'decimal',
  'declare',
  'decrement',
  'delete',
  'delimiter',
  'desc',
  'difference',
  'distinct',
  'divide',
  'do',
  'double',
  'drop',
  'else',
  'empty',
  'encoding',
  'end',
  'equals',
  'escape',
  'exclusive',
  'exec',
  'execute',
  'exists',
  'explain',
  'false',
  'fetch',
  'field',
  'file',
  'first',
  'float',
  'for',
  'from',
  'function',
  'go',
  'goto',
  'grant',
  'greater',
  'group',
  'having',
  'identified',
  'if',
  'immediate',
  'in',
  'increment',
  'index',
  'initial',
  'inner',
  'inout',
  'input',
  'insert',
  'int',
  'integer',
  'intersect',
  'intersection',
  'into',
  'is',
  'isempty',
  'isnull',
  'join',
  'last',
  'left',
  'less',
  'like',
  'limit',
  'lock',
  'long',
  'max',
  'min',
  'minus',
  'mode',
  'modify',
  'modulo',
  'more',
  'multiply',
  'next',
  'noaudit',
  'not',
  'notin',
  'nowait',
  'null',
  'number',
  'object',
  'of',
  'on',
  'option',
  'or',
  'order',
  'outer',
  'output',
  'power',
  'previous',
  'prior',
  'privileges',
  'public',
  'raise',
  'raw',
  'remainder',
  'rename',
  'resource',
  'return',
  'returns',
  'revoke',
  'right',
  'row',
  'rows',
  'select',
  'session',
  'set',
  'share',
  'size',
  'sql',
  'start',
  'strict',
  'string',
  'subtract',
  'sum',
  'synonym',
  'table',
  'then',
  'to',
  'trans',
  'transaction',
  'trigger',
  'true',
  'uid',
  'union',
  'unique',
  'update',
  'user',
  'validate',
  'values',
  'view',
  'when',
  'whenever',
  'where',
  'while',
  'with',
]);

/**
 * Escapes the JQL string-literal special characters (`\` and `"`) in a value.
 *
 * The result is safe to place inside a double-quoted JQL string; it does not
 * add the surrounding quotes — use {@link quoteJqlString} for that.
 *
 * @param value - The value to escape
 * @returns The escaped value
 */
export function escapeJqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Escapes a value and wraps it in double quotes, producing a JQL string literal.
 *
 * @param value - The value to quote
 * @returns A double-quoted, escaped JQL string literal
 *
 * @example
 * ```typescript
 * quoteJqlString('My "special" project'); // "My \"special\" project"
 * ```
 */
export function quoteJqlString(value: string): string {
  return `"${escapeJqlString(value)}"`;
}

/** Matches bare JQL identifiers that never need quoting (e.g. `status`, `PROJ-42`, `-7d`). */
const BARE_IDENTIFIER = /^[A-Za-z0-9._-]+$/;
/** Matches custom-field references such as `cf[10010]`, which must not be quoted. */
const CUSTOM_FIELD_REF = /^cf\[\d+\]$/;

/**
 * Determines whether a field name or bare value must be quoted in JQL:
 * empty strings, values with spaces or special characters, and
 * {@link JQL_RESERVED_WORDS} all require quoting. Custom-field references
 * (`cf[10010]`) never do.
 *
 * @param value - The field name or value to test
 * @returns `true` if the value must be quoted
 */
export function needsJqlQuoting(value: string): boolean {
  if (CUSTOM_FIELD_REF.test(value)) {
    return false;
  }

  if (!BARE_IDENTIFIER.test(value)) {
    return true;
  }

  return JQL_RESERVED_WORDS.has(value.toLowerCase());
}

/**
 * Formats a field name for use in a JQL clause, quoting it only when required
 * (spaces, special characters, or reserved words). Custom-field references
 * (`cf[10010]`) are passed through unquoted.
 *
 * @param name - The field name (e.g. `'status'`, `'Epic Link'`, `'cf[10010]'`)
 * @returns The field name, quoted if necessary
 * @throws {TypeError} If `name` is empty
 */
export function formatJqlField(name: string): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new TypeError('JQL field name must be a non-empty string');
  }

  const trimmed = name.trim();

  return needsJqlQuoting(trimmed) ? quoteJqlString(trimmed) : trimmed;
}

/**
 * Formats a `Date` as a JQL date-time literal (`"yyyy-MM-dd HH:mm"`, local time).
 *
 * @param date - The date to format
 * @returns A quoted JQL date-time literal
 */
export function formatJqlDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const formatted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return `"${formatted}"`;
}

/**
 * Formats a right-hand-side operand for a JQL comparison:
 * - `string` → quoted and escaped (always, so user input is safe)
 * - `number` → inserted bare
 * - `Date` → quoted `"yyyy-MM-dd HH:mm"` literal (local time)
 * - {@link JqlRaw} (function calls, raw fragments) → inserted verbatim
 *
 * @param value - The operand to format
 * @returns The JQL representation of the operand
 * @throws {TypeError} If the value is `null`, `undefined`, or an unsupported type
 */
export function formatJqlOperand(value: JqlOperand): string {
  if (value instanceof JqlRaw) {
    return value.toJql();
  }

  if (value instanceof Date) {
    return formatJqlDate(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`JQL operand must be a finite number, got: ${value}`);
    }

    return String(value);
  }

  if (typeof value === 'string') {
    return quoteJqlString(value);
  }

  throw new TypeError(`Unsupported JQL operand: ${String(value)}`);
}
