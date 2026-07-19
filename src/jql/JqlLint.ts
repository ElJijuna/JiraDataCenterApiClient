import { tokenizeJql, type JqlToken } from './JqlLexer';

/** A problem found by {@link lintJql}. */
export interface JqlLintIssue {
  /** `error` issues make the query invalid; `warning` issues are suspicious but may run */
  severity: 'error' | 'warning';
  /** Human-readable description of the problem */
  message: string;
  /** Zero-based start offset of the offending token */
  start: number;
  /** Zero-based end offset (exclusive) of the offending token */
  end: number;
}

const LOGICAL_KEYWORDS = new Set(['and', 'or']);
const ORDER_BY_ALLOWED = new Set(['asc', 'desc']);

/** @internal */
function isKeyword(token: JqlToken | undefined, keyword: string): boolean {
  return token !== undefined && token.type === 'word' && token.value.toLowerCase() === keyword;
}

/** @internal */
function isLogical(token: JqlToken | undefined): boolean {
  return token !== undefined && token.type === 'word' && LOGICAL_KEYWORDS.has(token.value.toLowerCase());
}

/** @internal */
function issueAt(token: JqlToken, message: string, severity: 'error' | 'warning' = 'error'): JqlLintIssue {
  return { severity, message, start: token.start, end: token.end };
}

/**
 * Checks a JQL query for common structural mistakes without contacting the
 * server: unterminated strings, unbalanced parentheses, dangling `AND`/`OR`,
 * comparison operators with a missing operand, misplaced commas, and
 * malformed `ORDER BY` clauses.
 *
 * This is a fast heuristic lint, not a full JQL grammar — a query with no
 * issues can still be rejected by Jira (e.g. unknown fields). For
 * authoritative validation use `JiraClient.validateJql()`, which asks the
 * server.
 *
 * @param query - The JQL query text
 * @returns The list of issues found (empty when none)
 *
 * @example
 * ```typescript
 * lintJql('project = OPS AND');
 * // [{ severity: 'error', message: 'Query must not end with "AND"', ... }]
 * ```
 */
export function lintJql(query: string): JqlLintIssue[] {
  const issues: JqlLintIssue[] = [];
  const tokens = tokenizeJql(query);
  if (tokens.length === 0) return issues;

  const parenStack: JqlToken[] = [];
  let orderByIndex = -1;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];

    if (token.type === 'error') {
      issues.push(issueAt(token, token.message ?? 'Unexpected input'));
      continue;
    }

    if (orderByIndex !== -1) {
      if (token.type === 'comma') continue;
      const isSortToken = token.type === 'string' || token.type === 'number' || (token.type === 'word' && !isLogical(token));
      if (!isSortToken) {
        issues.push(issueAt(token, `Unexpected "${token.value}" in ORDER BY clause`));
      } else if (token.type === 'word' && ORDER_BY_ALLOWED.has(token.value.toLowerCase()) && prev?.type === 'comma') {
        issues.push(issueAt(token, `"${token.value.toUpperCase()}" must follow a field name`));
      }
      continue;
    }

    if (token.type === 'lparen') {
      parenStack.push(token);
      if (next?.type === 'rparen') {
        issues.push(issueAt(token, 'Empty parentheses'));
      }
      continue;
    }

    if (token.type === 'rparen') {
      if (parenStack.length === 0) {
        issues.push(issueAt(token, 'Unmatched ")"'));
      } else {
        parenStack.pop();
      }
      continue;
    }

    if (token.type === 'comma') {
      if (parenStack.length === 0 && orderByIndex === -1) {
        issues.push(issueAt(token, 'Unexpected "," outside of a list or ORDER BY clause'));
      }
      continue;
    }

    if (token.type === 'operator') {
      if (prev === undefined || prev.type === 'operator' || prev.type === 'lparen' || prev.type === 'comma' || isLogical(prev)) {
        issues.push(issueAt(token, `Comparison operator "${token.value}" is missing its left-hand field`));
      }
      if (next === undefined || isLogical(next)) {
        issues.push(issueAt(token, `Comparison operator "${token.value}" is missing its right-hand value`));
      } else if (next.type === 'operator' || next.type === 'rparen' || next.type === 'comma') {
        issues.push(issueAt(token, `Unexpected "${next.value}" after comparison operator "${token.value}"`));
      }
      continue;
    }

    if (isLogical(token)) {
      if (prev === undefined) {
        issues.push(issueAt(token, `Query must not start with "${token.value.toUpperCase()}"`));
      } else if (isLogical(prev)) {
        issues.push(issueAt(token, `"${prev.value.toUpperCase()}" must not be followed by "${token.value.toUpperCase()}"`));
      }
      if (next === undefined) {
        issues.push(issueAt(token, `Query must not end with "${token.value.toUpperCase()}"`));
      }
      continue;
    }

    if (isKeyword(token, 'not') && next === undefined) {
      issues.push(issueAt(token, 'Query must not end with "NOT"'));
      continue;
    }

    if (isKeyword(token, 'in')) {
      if (next === undefined) {
        issues.push(issueAt(token, '"IN" must be followed by a list or function'));
      } else if (next.type !== 'lparen' && !(next.type === 'word' && tokens[i + 2]?.type === 'lparen')) {
        issues.push(issueAt(token, '"IN" must be followed by a parenthesized list or a function call'));
      }
      continue;
    }

    if (isKeyword(token, 'order') && parenStack.length === 0 && orderByIndex === -1) {
      if (!isKeyword(next, 'by')) {
        issues.push(issueAt(token, '"ORDER" must be followed by "BY"'));
      } else if (tokens[i + 2] === undefined) {
        issues.push(issueAt(token, '"ORDER BY" must be followed by at least one field'));
      } else {
        orderByIndex = i;
        i += 1;
      }
      continue;
    }
  }

  for (const openParen of parenStack) {
    issues.push(issueAt(openParen, 'Unmatched "("'));
  }

  return issues;
}

/**
 * Returns `true` when {@link lintJql} finds no `error`-severity issues.
 *
 * @param query - The JQL query text
 */
export function isValidJql(query: string): boolean {
  return lintJql(query).every((issue) => issue.severity !== 'error');
}
