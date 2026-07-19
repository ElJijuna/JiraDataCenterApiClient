import * as api from '../src/index';

describe('public API surface', () => {
  it('exports the client, resources, and error type', () => {
    expect(api.JiraClient).toBeDefined();
    expect(api.JiraApiError).toBeDefined();
    expect(api.Security).toBeDefined();
    expect(api.IssueResource).toBeDefined();
    expect(api.ProjectResource).toBeDefined();
    expect(api.BoardResource).toBeDefined();
    expect(api.SprintResource).toBeDefined();
    expect(api.MetricsResource).toBeDefined();
  });

  it('exports the JQL utilities', () => {
    expect(api.jql().project('OPS').build()).toBe('project = "OPS"');
    expect(api.field('status').eq('Open').toJql()).toBe('status = "Open"');
    expect(api.and(api.field('a').eq(1), api.or(api.field('b').eq(2), api.not(api.field('c').eq(3)))).toJql())
      .toBe('a = 1 AND (b = 2 OR NOT (c = 3))');
    expect(api.raw('x = 1')).toBeInstanceOf(api.JqlRaw);
    expect(api.JqlFunctions.currentUser().toJql()).toBe('currentUser()');
    expect(api.quoteJqlString('a"b')).toBe('"a\\"b"');
    expect(api.escapeJqlString('\\')).toBe('\\\\');
    expect(api.needsJqlQuoting('Epic Link')).toBe(true);
    expect(api.formatJqlField('Epic Link')).toBe('"Epic Link"');
    expect(api.formatJqlOperand(1)).toBe('1');
    expect(api.formatJqlDate(new Date(2026, 0, 1, 0, 0))).toBe('"2026-01-01 00:00"');
    expect(api.JQL_RESERVED_WORDS.has('order')).toBe(true);
    expect(api.tokenizeJql('a = 1')).toHaveLength(3);
    expect(api.lintJql('a = 1')).toEqual([]);
    expect(api.isValidJql('a = 1 AND')).toBe(false);
    expect(api.formatJql('a=1 and b=2')).toBe('a = 1 AND b = 2');
    expect(new api.JqlBuilder().build()).toBe('');
    expect(new api.JqlField('status').isEmpty().toJql()).toBe('status IS EMPTY');
  });
});
