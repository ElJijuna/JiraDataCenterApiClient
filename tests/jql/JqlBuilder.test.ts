import { and, field, JqlBuilder, JqlClause, jql, not, or } from '../../src/jql/JqlBuilder';
import { JqlFunctions } from '../../src/jql/JqlFunctions';
import { JqlRaw, raw } from '../../src/jql/JqlRaw';

describe('field()', () => {
  it('renders comparison operators', () => {
    expect(field('project').eq('OPS').toJql()).toBe('project = "OPS"');
    expect(field('status').notEq('Closed').toJql()).toBe('status != "Closed"');
    expect(field('votes').gt(10).toJql()).toBe('votes > 10');
    expect(field('updated').gte('-7d').toJql()).toBe('updated >= "-7d"');
    expect(
      field('created')
        .lt(new Date(2026, 0, 1, 0, 0))
        .toJql(),
    ).toBe('created < "2026-01-01 00:00"');
    expect(field('duedate').lte('2026-12-31').toJql()).toBe('duedate <= "2026-12-31"');
    expect(field('summary').contains('timeout').toJql()).toBe('summary ~ "timeout"');
    expect(field('summary').notContains('noise').toJql()).toBe('summary !~ "noise"');
  });

  it('renders IN and NOT IN with variadic values or arrays', () => {
    expect(field('status').in('Open', 'Reopened').toJql()).toBe('status IN ("Open", "Reopened")');
    expect(field('status').in(['Open', 'Reopened']).toJql()).toBe('status IN ("Open", "Reopened")');
    expect(field('priority').notIn('Low', 'Trivial').toJql()).toBe(
      'priority NOT IN ("Low", "Trivial")',
    );
    expect(field('sprint').in(JqlFunctions.openSprints()).toJql()).toBe(
      'sprint IN (openSprints())',
    );
  });

  it('rejects empty lists', () => {
    expect(() => field('status').in()).toThrow(TypeError);
    expect(() => field('status').in([])).toThrow(TypeError);
    expect(() => field('status').notIn()).toThrow(TypeError);
    expect(() => field('status').wasIn([])).toThrow(TypeError);
  });

  it('renders IS EMPTY / IS NOT EMPTY', () => {
    expect(field('resolution').isEmpty().toJql()).toBe('resolution IS EMPTY');
    expect(field('assignee').isNotEmpty().toJql()).toBe('assignee IS NOT EMPTY');
  });

  it('renders WAS / WAS NOT / WAS IN / WAS NOT IN / CHANGED', () => {
    expect(field('status').was('Resolved').toJql()).toBe('status WAS "Resolved"');
    expect(field('status').wasNot('Closed').toJql()).toBe('status WAS NOT "Closed"');
    expect(field('status').wasIn(['Open', 'Reopened']).toJql()).toBe(
      'status WAS IN ("Open", "Reopened")',
    );
    expect(field('status').wasNotIn(['Done']).toJql()).toBe('status WAS NOT IN ("Done")');
    expect(field('assignee').changed().toJql()).toBe('assignee CHANGED');
  });

  it('renders history predicates', () => {
    expect(
      field('status')
        .changed({
          from: 'Open',
          to: 'Done',
          by: 'pilmee',
          before: '2026-01-01',
          after: new Date(2025, 11, 1, 8, 30),
        })
        .toJql(),
    ).toBe(
      'status CHANGED FROM "Open" TO "Done" BY "pilmee" BEFORE "2026-01-01" AFTER "2025-12-01 08:30"',
    );
    expect(field('status').was('Open', { on: '2026-01-01' }).toJql()).toBe(
      'status WAS "Open" ON "2026-01-01"',
    );
    expect(
      field('status')
        .wasIn(['Open'], { during: ['2026-01-01', '2026-02-01'] })
        .toJql(),
    ).toBe('status WAS IN ("Open") DURING ("2026-01-01", "2026-02-01")');
  });

  it('quotes field names that need quoting', () => {
    expect(field('Epic Link').eq('OPS-1').toJql()).toBe('"Epic Link" = "OPS-1"');
    expect(field('cf[10010]').eq(5).toJql()).toBe('cf[10010] = 5');
  });

  it('clauses stringify via toString', () => {
    expect(String(field('a').eq(1))).toBe('a = 1');
    expect(field('a').eq(1)).toBeInstanceOf(JqlClause);
  });
});

describe('and / or / not', () => {
  it('joins clauses and parenthesizes mixed logical nesting', () => {
    expect(and(field('a').eq(1), field('b').eq(2)).toJql()).toBe('a = 1 AND b = 2');
    expect(or(field('a').eq(1), field('b').eq(2)).toJql()).toBe('a = 1 OR b = 2');
    expect(and(field('a').eq(1), or(field('b').eq(2), field('c').eq(3))).toJql()).toBe(
      'a = 1 AND (b = 2 OR c = 3)',
    );
    expect(or(and(field('a').eq(1), field('b').eq(2)), field('c').eq(3)).toJql()).toBe(
      '(a = 1 AND b = 2) OR c = 3',
    );
  });

  it('flattens same-operator nesting without redundant parens', () => {
    expect(and(and(field('a').eq(1), field('b').eq(2)), field('c').eq(3)).toJql()).toBe(
      'a = 1 AND b = 2 AND c = 3',
    );
  });

  it('parenthesizes raw fragments and plain strings when combined', () => {
    expect(and('a = 1 OR b = 2', field('c').eq(3)).toJql()).toBe('(a = 1 OR b = 2) AND c = 3');
    expect(or(raw('x = 1'), 'y = 2').toJql()).toBe('(x = 1) OR (y = 2)');
  });

  it('collapses single-clause groups', () => {
    expect(and(field('a').eq(1)).toJql()).toBe('a = 1');
  });

  it('negates with NOT (…)', () => {
    expect(not(field('status').eq('Closed')).toJql()).toBe('NOT (status = "Closed")');
    expect(not(or(field('a').eq(1), field('b').eq(2))).toJql()).toBe('NOT (a = 1 OR b = 2)');
  });

  it('rejects empty groups and invalid clause inputs', () => {
    expect(() => and()).toThrow(TypeError);
    expect(() => or()).toThrow(TypeError);
    expect(() => and(42 as never)).toThrow(TypeError);
    expect(() => and('   ')).toThrow(TypeError);
  });
});

describe('JqlRaw', () => {
  it('trims and preserves the fragment', () => {
    expect(raw('  a = 1 ').toJql()).toBe('a = 1');
  });

  it('rejects empty fragments', () => {
    expect(() => raw('')).toThrow(TypeError);
    expect(() => raw('  ')).toThrow(TypeError);
    expect(() => new JqlRaw(undefined as never)).toThrow(TypeError);
  });
});

describe('jql() builder', () => {
  it('builds an empty query from an empty builder', () => {
    expect(jql().build()).toBe('');
    expect(jql()).toBeInstanceOf(JqlBuilder);
  });

  it('chains bound-field conditions with AND', () => {
    const query = jql()
      .field('project')
      .eq('OPS')
      .field('status')
      .in('Open', 'In Progress')
      .field('assignee')
      .eq(JqlFunctions.currentUser())
      .field('updated')
      .gte('-7d')
      .build();

    expect(query).toBe(
      'project = "OPS" AND status IN ("Open", "In Progress") AND assignee = currentUser() AND updated >= "-7d"',
    );
  });

  it('supports every bound-field condition', () => {
    expect(jql().field('a').notEq(1).build()).toBe('a != 1');
    expect(jql().field('a').gt(1).build()).toBe('a > 1');
    expect(jql().field('a').lt(1).build()).toBe('a < 1');
    expect(jql().field('a').lte(1).build()).toBe('a <= 1');
    expect(jql().field('a').contains('x').build()).toBe('a ~ "x"');
    expect(jql().field('a').notContains('x').build()).toBe('a !~ "x"');
    expect(jql().field('a').notIn(1, 2).build()).toBe('a NOT IN (1, 2)');
    expect(jql().field('a').isEmpty().build()).toBe('a IS EMPTY');
    expect(jql().field('a').isNotEmpty().build()).toBe('a IS NOT EMPTY');
    expect(jql().field('a').was('x').build()).toBe('a WAS "x"');
    expect(jql().field('a').wasNot('x').build()).toBe('a WAS NOT "x"');
    expect(jql().field('a').wasIn(['x']).build()).toBe('a WAS IN ("x")');
    expect(jql().field('a').wasNotIn(['x']).build()).toBe('a WAS NOT IN ("x")');
    expect(jql().field('a').changed({ after: '-1w' }).build()).toBe('a CHANGED AFTER "-1w"');
  });

  it('joins orField conditions with OR', () => {
    expect(jql().field('a').eq(1).orField('b').eq(2).build()).toBe('a = 1 OR b = 2');
  });

  it('supports where/and/or with clauses, strings, and raw fragments', () => {
    expect(jql().where(field('a').eq(1)).and(field('b').eq(2)).or(field('c').eq(3)).build()).toBe(
      'a = 1 AND b = 2 OR c = 3',
    );
    expect(jql().where('project = OPS').build()).toBe('project = OPS');
    expect(jql().where('a = 1').and(raw('b = 2 OR c = 3')).build()).toBe(
      '(a = 1) AND (b = 2 OR c = 3)',
    );
  });

  it('parenthesizes grouped clauses only when needed', () => {
    expect(
      jql()
        .where(or(field('a').eq(1), field('b').eq(2)))
        .build(),
    ).toBe('a = 1 OR b = 2');
    expect(
      jql()
        .field('c')
        .eq(3)
        .where(or(field('a').eq(1), field('b').eq(2)))
        .build(),
    ).toBe('c = 3 AND (a = 1 OR b = 2)');
  });

  it('supports shorthand filters with one or many values', () => {
    expect(jql().project('OPS').build()).toBe('project = "OPS"');
    expect(jql().project('OPS', 'CORE').build()).toBe('project IN ("OPS", "CORE")');
    expect(jql().status('Open').build()).toBe('status = "Open"');
    expect(jql().type('Bug', 'Task').build()).toBe('issuetype IN ("Bug", "Task")');
    expect(jql().assignee(JqlFunctions.currentUser()).build()).toBe('assignee = currentUser()');
    expect(jql().reporter('pilmee').build()).toBe('reporter = "pilmee"');
    expect(jql().priority('High', 'Highest').build()).toBe('priority IN ("High", "Highest")');
    expect(jql().labels('urgent').build()).toBe('labels = "urgent"');
    expect(jql().component('api', 'web').build()).toBe('component IN ("api", "web")');
    expect(jql().fixVersion('1.1.0').build()).toBe('fixVersion = "1.1.0"');
    expect(jql().sprint(42).build()).toBe('sprint = 42');
    expect(jql().text('connection timeout').build()).toBe('text ~ "connection timeout"');
  });

  it('rejects shorthands without values', () => {
    expect(() => jql().project()).toThrow(TypeError);
    expect(() => jql().status()).toThrow(TypeError);
  });

  it('renders ORDER BY with defaults and multiple sorts', () => {
    expect(jql().project('OPS').orderBy('updated', 'DESC').orderBy('priority').build()).toBe(
      'project = "OPS" ORDER BY updated DESC, priority ASC',
    );
    expect(jql().orderBy('Epic Link').build()).toBe('ORDER BY "Epic Link" ASC');
  });

  it('stringifies via toString', () => {
    expect(String(jql().project('OPS'))).toBe('project = "OPS"');
    expect(jql().status('Open').toString()).toBe('status = "Open"');
  });
});

describe('jql tagged template', () => {
  it('quotes and escapes interpolated strings', () => {
    const userInput = 'a "b" \\ c';

    expect(jql`project = ${'OPS'} AND summary ~ ${userInput}`).toBe(
      'project = "OPS" AND summary ~ "a \\"b\\" \\\\ c"',
    );
  });

  it('inserts numbers bare and formats dates', () => {
    expect(jql`sprint = ${42}`).toBe('sprint = 42');
    expect(jql`created >= ${new Date(2026, 0, 1, 0, 0)}`).toBe('created >= "2026-01-01 00:00"');
  });

  it('renders arrays as JQL lists', () => {
    expect(jql`status IN ${['Open', 'Reopened']}`).toBe('status IN ("Open", "Reopened")');
    expect(jql`sprint IN ${[1, 2, 3]}`).toBe('sprint IN (1, 2, 3)');
  });

  it('inserts raw fragments, clauses, and builders verbatim', () => {
    expect(jql`assignee = ${JqlFunctions.currentUser()}`).toBe('assignee = currentUser()');
    expect(jql`${field('a').eq(1)} AND b = 2`).toBe('a = 1 AND b = 2');
    expect(jql`(${jql().project('OPS')}) OR flagged = true`).toBe(
      '(project = "OPS") OR flagged = true',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(jql`  project = ${'OPS'}  `).toBe('project = "OPS"');
  });

  it('rejects null, undefined, and empty list values', () => {
    expect(() => jql`a = ${null as never}`).toThrow(TypeError);
    expect(() => jql`a = ${undefined as never}`).toThrow(TypeError);
    expect(() => jql`a IN ${[] as never}`).toThrow(TypeError);
  });
});
