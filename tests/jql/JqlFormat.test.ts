import { formatJql } from '../../src/jql/JqlFormat';

describe('formatJql', () => {
  it('normalizes spacing and uppercases keywords', () => {
    expect(formatJql('project=OPS and status in("Open","Reopened")order by updated desc'))
      .toBe('project = OPS AND status IN ("Open", "Reopened") ORDER BY updated DESC');
  });

  it('keeps function calls attached to their parentheses', () => {
    expect(formatJql('sprint in openSprints() and assignee=currentUser()'))
      .toBe('sprint IN openSprints() AND assignee = currentUser()');
  });

  it('does not attach list parens after keywords', () => {
    expect(formatJql('status not in("Open")')).toBe('status NOT IN ("Open")');
  });

  it('preserves string literals exactly', () => {
    expect(formatJql('summary ~ "a  \\"b\\"  c"')).toBe('summary ~ "a  \\"b\\"  c"');
    expect(formatJql("summary ~ 'single'")).toBe("summary ~ 'single'");
  });

  it('uppercases history and predicate keywords', () => {
    expect(formatJql('status was "Open" by pilmee during (a, b) and resolution is empty'))
      .toBe('status WAS "Open" BY pilmee DURING (a, b) AND resolution IS EMPTY');
  });

  it('handles nested parentheses', () => {
    expect(formatJql('( a=1 or ( b=2 and c=3 ) )')).toBe('(a = 1 OR (b = 2 AND c = 3))');
  });

  it('returns empty output for empty input', () => {
    expect(formatJql('')).toBe('');
    expect(formatJql('   ')).toBe('');
  });

  it('splits top-level AND/OR and ORDER BY when multiline', () => {
    expect(formatJql('a = 1 and (b = 2 or c = 3) or d = 4 order by a asc, b desc', { multiline: true }))
      .toBe('a = 1\nAND (b = 2 OR c = 3)\nOR d = 4\nORDER BY a ASC, b DESC');
  });

  it('does not split AND/OR inside parentheses when multiline', () => {
    expect(formatJql('(a = 1 or b = 2) and c = 3', { multiline: true }))
      .toBe('(a = 1 OR b = 2)\nAND c = 3');
  });

  it('throws on queries that cannot be tokenized', () => {
    expect(() => formatJql('summary ~ "unterminated')).toThrow(TypeError);
    expect(() => formatJql('a ! b')).toThrow(TypeError);
  });
});
