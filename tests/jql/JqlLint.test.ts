import { tokenizeJql } from '../../src/jql/JqlLexer';
import { isValidJql, lintJql } from '../../src/jql/JqlLint';

const errorMessages = (query: string): string[] =>
  lintJql(query)
    .filter((issue) => issue.severity === 'error')
    .map((issue) => issue.message);

describe('tokenizeJql', () => {
  it('tokenizes a full query with positions', () => {
    const tokens = tokenizeJql('project = "My App" AND cf[10010] >= -7');

    expect(tokens.map((t) => [t.type, t.value])).toEqual([
      ['word', 'project'],
      ['operator', '='],
      ['string', '"My App"'],
      ['word', 'AND'],
      ['word', 'cf[10010]'],
      ['operator', '>='],
      ['number', '-7'],
    ]);
    expect(tokens[0]).toMatchObject({ start: 0, end: 7 });
  });

  it('handles single quotes and escaped quotes inside strings', () => {
    expect(tokenizeJql("summary ~ 'it\\'s'").map((t) => t.type)).toEqual([
      'word',
      'operator',
      'string',
    ]);
    expect(tokenizeJql('a = "x \\" y"')[2].value).toBe('"x \\" y"');
  });

  it('tokenizes parens, commas, and all operators', () => {
    const tokens = tokenizeJql('a != 1, b !~ x (c < 2) d > 3 e <= 4 f ~ g');

    expect(tokens.map((t) => t.value)).toEqual([
      'a',
      '!=',
      '1',
      ',',
      'b',
      '!~',
      'x',
      '(',
      'c',
      '<',
      '2',
      ')',
      'd',
      '>',
      '3',
      'e',
      '<=',
      '4',
      'f',
      '~',
      'g',
    ]);
  });

  it('emits error tokens for unterminated strings and stray "!"', () => {
    const [unterminated] = tokenizeJql('"abc').filter((t) => t.type === 'error');

    expect(unterminated.message).toContain('Unterminated string');
    const bang = tokenizeJql('a ! b').find((t) => t.type === 'error');

    expect(bang?.message).toContain('"!"');
  });

  it('returns no tokens for empty or whitespace input', () => {
    expect(tokenizeJql('')).toEqual([]);
    expect(tokenizeJql('  \t\n ')).toEqual([]);
  });
});

describe('lintJql', () => {
  it('accepts well-formed queries', () => {
    expect(lintJql('')).toEqual([]);
    expect(
      lintJql(
        'project = "OPS" AND status IN ("Open", "Reopened") ORDER BY updated DESC, priority ASC',
      ),
    ).toEqual([]);
    expect(lintJql('assignee IN membersOf("jira-users") AND NOT (status = Closed)')).toEqual([]);
    expect(lintJql('status CHANGED FROM "Open" TO "Done" BY pilmee AFTER -7d')).toEqual([]);
    expect(lintJql('ORDER BY created')).toEqual([]);
  });

  it('reports unterminated strings', () => {
    expect(errorMessages('summary ~ "abc')).toEqual([
      expect.stringContaining('Unterminated string'),
    ]);
  });

  it('reports unbalanced parentheses', () => {
    expect(errorMessages('(a = 1')).toEqual([expect.stringContaining('Unmatched "("')]);
    expect(errorMessages('a = 1)')).toEqual([expect.stringContaining('Unmatched ")"')]);
    expect(errorMessages('a IN ()')).toEqual([expect.stringContaining('Empty parentheses')]);
  });

  it('reports dangling or doubled logical operators', () => {
    expect(errorMessages('AND a = 1')).toEqual([
      expect.stringContaining('must not start with "AND"'),
    ]);
    expect(errorMessages('a = 1 OR')).toEqual([expect.stringContaining('must not end with "OR"')]);
    expect(errorMessages('a = 1 AND OR b = 2')).toContainEqual(
      expect.stringContaining('"AND" must not be followed by "OR"'),
    );
    expect(errorMessages('a = 1 AND NOT')).toEqual([
      expect.stringContaining('must not end with "NOT"'),
    ]);
  });

  it('reports comparison operators with missing operands', () => {
    expect(errorMessages('= 1')).toContainEqual(
      expect.stringContaining('missing its left-hand field'),
    );
    expect(errorMessages('a =')).toContainEqual(
      expect.stringContaining('missing its right-hand value'),
    );
    expect(errorMessages('a = AND b = 2')).toContainEqual(
      expect.stringContaining('missing its right-hand value'),
    );
    expect(errorMessages('a = = 1')).toContainEqual(
      expect.stringContaining('Unexpected "=" after comparison operator'),
    );
    expect(errorMessages('a = 1 AND = 2')).toContainEqual(
      expect.stringContaining('missing its left-hand field'),
    );
  });

  it('reports malformed IN clauses', () => {
    expect(errorMessages('status IN')).toEqual([expect.stringContaining('"IN" must be followed')]);
    expect(errorMessages('status IN Open')).toEqual([
      expect.stringContaining('parenthesized list or a function call'),
    ]);
    expect(lintJql('status IN (Open)')).toEqual([]);
    expect(lintJql('assignee NOT IN membersOf("g")')).toEqual([]);
  });

  it('reports misplaced commas', () => {
    expect(errorMessages('a = 1, b = 2')).toEqual([expect.stringContaining('Unexpected ","')]);
    expect(lintJql('a IN (1, 2)')).toEqual([]);
  });

  it('reports malformed ORDER BY clauses', () => {
    expect(errorMessages('a = 1 ORDER updated')).toEqual([
      expect.stringContaining('"ORDER" must be followed by "BY"'),
    ]);
    expect(errorMessages('a = 1 ORDER BY')).toEqual([
      expect.stringContaining('followed by at least one field'),
    ]);
    expect(errorMessages('a = 1 ORDER BY updated = 2')).toContainEqual(
      expect.stringContaining('in ORDER BY clause'),
    );
    expect(errorMessages('ORDER BY created, DESC')).toContainEqual(
      expect.stringContaining('must follow a field name'),
    );
  });
});

describe('isValidJql', () => {
  it('returns true for valid queries and false for broken ones', () => {
    expect(isValidJql('project = OPS ORDER BY updated DESC')).toBe(true);
    expect(isValidJql('project = OPS AND')).toBe(false);
    expect(isValidJql('(a = 1')).toBe(false);
  });
});
