import {
  JQL_RESERVED_WORDS,
  escapeJqlString,
  quoteJqlString,
  needsJqlQuoting,
  formatJqlField,
  formatJqlDate,
  formatJqlOperand,
} from '../../src/jql/JqlEscape';
import { raw } from '../../src/jql/JqlRaw';

describe('escapeJqlString', () => {
  it('escapes backslashes and double quotes', () => {
    expect(escapeJqlString('a "quoted" \\ value')).toBe('a \\"quoted\\" \\\\ value');
  });

  it('leaves plain strings untouched', () => {
    expect(escapeJqlString('plain')).toBe('plain');
  });
});

describe('quoteJqlString', () => {
  it('wraps the escaped value in double quotes', () => {
    expect(quoteJqlString('My "special" project')).toBe('"My \\"special\\" project"');
  });
});

describe('needsJqlQuoting', () => {
  it('does not quote bare identifiers', () => {
    expect(needsJqlQuoting('status')).toBe(false);
    expect(needsJqlQuoting('PROJ-42')).toBe(false);
    expect(needsJqlQuoting('-7d')).toBe(false);
    expect(needsJqlQuoting('jira.internal_field')).toBe(false);
  });

  it('does not quote custom field references', () => {
    expect(needsJqlQuoting('cf[10010]')).toBe(false);
  });

  it('quotes values with spaces or special characters', () => {
    expect(needsJqlQuoting('Epic Link')).toBe(true);
    expect(needsJqlQuoting('a+b')).toBe(true);
    expect(needsJqlQuoting('')).toBe(true);
  });

  it('quotes reserved words regardless of case', () => {
    expect(needsJqlQuoting('order')).toBe(true);
    expect(needsJqlQuoting('SELECT')).toBe(true);
    expect(needsJqlQuoting('Empty')).toBe(true);
  });

  it('exposes the reserved words list', () => {
    expect(JQL_RESERVED_WORDS.has('and')).toBe(true);
    expect(JQL_RESERVED_WORDS.has('status')).toBe(false);
  });
});

describe('formatJqlField', () => {
  it('passes bare field names through', () => {
    expect(formatJqlField('status')).toBe('status');
    expect(formatJqlField('cf[10010]')).toBe('cf[10010]');
  });

  it('quotes field names that need it and trims whitespace', () => {
    expect(formatJqlField('Epic Link')).toBe('"Epic Link"');
    expect(formatJqlField('  summary ')).toBe('summary');
  });

  it('throws on empty field names', () => {
    expect(() => formatJqlField('')).toThrow(TypeError);
    expect(() => formatJqlField('   ')).toThrow(TypeError);
    expect(() => formatJqlField(undefined as unknown as string)).toThrow(TypeError);
  });
});

describe('formatJqlDate', () => {
  it('formats as a quoted yyyy-MM-dd HH:mm literal', () => {
    expect(formatJqlDate(new Date(2026, 0, 5, 9, 7))).toBe('"2026-01-05 09:07"');
  });
});

describe('formatJqlOperand', () => {
  it('quotes strings', () => {
    expect(formatJqlOperand('Open')).toBe('"Open"');
  });

  it('inserts numbers bare', () => {
    expect(formatJqlOperand(42)).toBe('42');
    expect(formatJqlOperand(-1.5)).toBe('-1.5');
  });

  it('formats dates', () => {
    expect(formatJqlOperand(new Date(2026, 6, 19, 23, 59))).toBe('"2026-07-19 23:59"');
  });

  it('inserts raw fragments verbatim', () => {
    expect(formatJqlOperand(raw('currentUser()'))).toBe('currentUser()');
  });

  it('rejects non-finite numbers', () => {
    expect(() => formatJqlOperand(Infinity)).toThrow(TypeError);
    expect(() => formatJqlOperand(NaN)).toThrow(TypeError);
  });

  it('rejects unsupported values', () => {
    expect(() => formatJqlOperand(null as never)).toThrow(TypeError);
    expect(() => formatJqlOperand(undefined as never)).toThrow(TypeError);
    expect(() => formatJqlOperand({} as never)).toThrow(TypeError);
  });
});
