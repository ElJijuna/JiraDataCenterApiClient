import { JqlRaw } from './JqlRaw';
import { formatJqlField, formatJqlOperand, type JqlOperand } from './JqlEscape';

/**
 * Base class for all composable JQL clauses produced by {@link field},
 * {@link and}, {@link or}, and {@link not}.
 */
export abstract class JqlClause {
  /** Renders the clause as a JQL string. */
  abstract toJql(): string;

  /** Renders the clause as a JQL string. */
  toString(): string {
    return this.toJql();
  }
}

/** Anything accepted where a clause is expected: a built clause, a raw fragment, or a plain JQL string. */
export type JqlClauseInput = JqlClause | JqlRaw | string;

/**
 * History predicates for `WAS` / `CHANGED` clauses.
 * All date-like values accept strings (`'2026-01-01'`, `'-7d'`), `Date`s, or JQL functions.
 */
export interface JqlHistoryPredicates {
  /** `FROM value` — previous value (only meaningful with `CHANGED`). */
  from?: JqlOperand;
  /** `TO value` — new value (only meaningful with `CHANGED`). */
  to?: JqlOperand;
  /** `BY user` — who made the change. */
  by?: JqlOperand;
  /** `BEFORE date` */
  before?: JqlOperand;
  /** `AFTER date` */
  after?: JqlOperand;
  /** `ON date` */
  on?: JqlOperand;
  /** `DURING (from, to)` */
  during?: [JqlOperand, JqlOperand];
}

/** @internal */
function renderPredicates(predicates?: JqlHistoryPredicates): string {
  if (!predicates) return '';
  const parts: string[] = [];
  if (predicates.from !== undefined) parts.push(`FROM ${formatJqlOperand(predicates.from)}`);
  if (predicates.to !== undefined) parts.push(`TO ${formatJqlOperand(predicates.to)}`);
  if (predicates.by !== undefined) parts.push(`BY ${formatJqlOperand(predicates.by)}`);
  if (predicates.before !== undefined) parts.push(`BEFORE ${formatJqlOperand(predicates.before)}`);
  if (predicates.after !== undefined) parts.push(`AFTER ${formatJqlOperand(predicates.after)}`);
  if (predicates.on !== undefined) parts.push(`ON ${formatJqlOperand(predicates.on)}`);
  if (predicates.during !== undefined) {
    parts.push(`DURING (${formatJqlOperand(predicates.during[0])}, ${formatJqlOperand(predicates.during[1])})`);
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

/** @internal */
class TerminalClause extends JqlClause {
  constructor(private readonly jql: string) {
    super();
  }

  toJql(): string {
    return this.jql;
  }
}

/** @internal Wraps raw strings/fragments; parenthesized when combined so embedded AND/OR keep their meaning. */
class RawClause extends JqlClause {
  constructor(private readonly jql: string) {
    super();
    if (this.jql.trim().length === 0) {
      throw new TypeError('JQL clause must be a non-empty string');
    }
  }

  toJql(): string {
    return this.jql.trim();
  }
}

/** @internal */
class LogicalClause extends JqlClause {
  constructor(
    private readonly operator: 'AND' | 'OR',
    private readonly clauses: JqlClause[],
  ) {
    super();
    if (clauses.length === 0) {
      throw new TypeError(`${operator} requires at least one clause`);
    }
  }

  toJql(): string {
    if (this.clauses.length === 1) return this.clauses[0].toJql();
    return this.clauses
      .map((clause) => {
        const needsParens =
          (clause instanceof LogicalClause && clause.operator !== this.operator) ||
          clause instanceof RawClause;
        return needsParens ? `(${clause.toJql()})` : clause.toJql();
      })
      .join(` ${this.operator} `);
  }
}

/** @internal */
class NotClause extends JqlClause {
  constructor(private readonly clause: JqlClause) {
    super();
  }

  toJql(): string {
    return `NOT (${this.clause.toJql()})`;
  }
}

/** @internal */
function toClause(input: JqlClauseInput): JqlClause {
  if (input instanceof JqlClause) return input;
  if (input instanceof JqlRaw) return new RawClause(input.toJql());
  if (typeof input === 'string') return new RawClause(input);
  throw new TypeError(`Unsupported JQL clause: ${String(input)}`);
}

/** @internal */
function flattenValues(values: Array<JqlOperand | JqlOperand[]>): JqlOperand[] {
  const flat = values.flatMap((value) => (Array.isArray(value) ? value : [value]));
  if (flat.length === 0) {
    throw new TypeError('JQL list conditions require at least one value');
  }
  return flat;
}

/**
 * Condition factory for a single JQL field. Each method returns a composable
 * {@link JqlClause}. Created with {@link field}.
 *
 * @example
 * ```typescript
 * field('status').in('Open', 'Reopened').toJql();  // status IN ("Open", "Reopened")
 * field('summary').contains('timeout').toJql();     // summary ~ "timeout"
 * field('resolution').isEmpty().toJql();            // resolution IS EMPTY
 * ```
 */
export class JqlField {
  private readonly name: string;

  /** @param name - The field name (quoted automatically when required) */
  constructor(name: string) {
    this.name = formatJqlField(name);
  }

  private compare(operator: string, value: JqlOperand): JqlClause {
    return new TerminalClause(`${this.name} ${operator} ${formatJqlOperand(value)}`);
  }

  private list(operator: string, values: Array<JqlOperand | JqlOperand[]>, predicates?: JqlHistoryPredicates): JqlClause {
    const rendered = flattenValues(values).map((value) => formatJqlOperand(value));
    return new TerminalClause(`${this.name} ${operator} (${rendered.join(', ')})${renderPredicates(predicates)}`);
  }

  /** `field = value` */
  eq(value: JqlOperand): JqlClause {
    return this.compare('=', value);
  }

  /** `field != value` */
  notEq(value: JqlOperand): JqlClause {
    return this.compare('!=', value);
  }

  /** `field > value` */
  gt(value: JqlOperand): JqlClause {
    return this.compare('>', value);
  }

  /** `field >= value` */
  gte(value: JqlOperand): JqlClause {
    return this.compare('>=', value);
  }

  /** `field < value` */
  lt(value: JqlOperand): JqlClause {
    return this.compare('<', value);
  }

  /** `field <= value` */
  lte(value: JqlOperand): JqlClause {
    return this.compare('<=', value);
  }

  /** `field ~ value` — fuzzy/text match. */
  contains(value: JqlOperand): JqlClause {
    return this.compare('~', value);
  }

  /** `field !~ value` */
  notContains(value: JqlOperand): JqlClause {
    return this.compare('!~', value);
  }

  /** `field IN (a, b, …)` — accepts variadic values or a single array. */
  in(...values: Array<JqlOperand | JqlOperand[]>): JqlClause {
    return this.list('IN', values);
  }

  /** `field NOT IN (a, b, …)` */
  notIn(...values: Array<JqlOperand | JqlOperand[]>): JqlClause {
    return this.list('NOT IN', values);
  }

  /** `field IS EMPTY` */
  isEmpty(): JqlClause {
    return new TerminalClause(`${this.name} IS EMPTY`);
  }

  /** `field IS NOT EMPTY` */
  isNotEmpty(): JqlClause {
    return new TerminalClause(`${this.name} IS NOT EMPTY`);
  }

  /** `field WAS value [predicates]` */
  was(value: JqlOperand, predicates?: JqlHistoryPredicates): JqlClause {
    return new TerminalClause(`${this.name} WAS ${formatJqlOperand(value)}${renderPredicates(predicates)}`);
  }

  /** `field WAS NOT value [predicates]` */
  wasNot(value: JqlOperand, predicates?: JqlHistoryPredicates): JqlClause {
    return new TerminalClause(`${this.name} WAS NOT ${formatJqlOperand(value)}${renderPredicates(predicates)}`);
  }

  /** `field WAS IN (a, b, …) [predicates]` */
  wasIn(values: JqlOperand[], predicates?: JqlHistoryPredicates): JqlClause {
    return this.list('WAS IN', values, predicates);
  }

  /** `field WAS NOT IN (a, b, …) [predicates]` */
  wasNotIn(values: JqlOperand[], predicates?: JqlHistoryPredicates): JqlClause {
    return this.list('WAS NOT IN', values, predicates);
  }

  /** `field CHANGED [predicates]` */
  changed(predicates?: JqlHistoryPredicates): JqlClause {
    return new TerminalClause(`${this.name} CHANGED${renderPredicates(predicates)}`);
  }
}

/**
 * Creates a condition factory for a JQL field. Field names are quoted
 * automatically when they contain spaces, special characters, or reserved
 * words; custom-field references (`cf[10010]`) are passed through unquoted.
 *
 * @param name - The field name (e.g. `'status'`, `'Epic Link'`, `'cf[10010]'`)
 * @returns A {@link JqlField} whose methods produce composable clauses
 */
export function field(name: string): JqlField {
  return new JqlField(name);
}

/**
 * Combines clauses with `AND`. Nested `OR` groups and raw fragments are
 * parenthesized automatically.
 */
export function and(...clauses: JqlClauseInput[]): JqlClause {
  return new LogicalClause('AND', clauses.map(toClause));
}

/**
 * Combines clauses with `OR`. Nested `AND` groups and raw fragments are
 * parenthesized automatically.
 */
export function or(...clauses: JqlClauseInput[]): JqlClause {
  return new LogicalClause('OR', clauses.map(toClause));
}

/** Negates a clause: `NOT (clause)`. */
export function not(clause: JqlClauseInput): JqlClause {
  return new NotClause(toClause(clause));
}

/** Sort direction for `ORDER BY` clauses. */
export type JqlSortDirection = 'ASC' | 'DESC';

/**
 * A {@link JqlField} whose condition methods append the clause to a builder
 * (joined with `AND` or `OR`) and return the builder for further chaining.
 * Created via {@link JqlBuilder.field} / {@link JqlBuilder.orField}.
 */
export class JqlBoundField {
  constructor(
    private readonly builder: JqlBuilder,
    private readonly target: JqlField,
    private readonly connector: 'AND' | 'OR',
  ) {}

  private add(clause: JqlClause): JqlBuilder {
    return this.connector === 'OR' ? this.builder.or(clause) : this.builder.and(clause);
  }

  /** `field = value` */
  eq(value: JqlOperand): JqlBuilder {
    return this.add(this.target.eq(value));
  }

  /** `field != value` */
  notEq(value: JqlOperand): JqlBuilder {
    return this.add(this.target.notEq(value));
  }

  /** `field > value` */
  gt(value: JqlOperand): JqlBuilder {
    return this.add(this.target.gt(value));
  }

  /** `field >= value` */
  gte(value: JqlOperand): JqlBuilder {
    return this.add(this.target.gte(value));
  }

  /** `field < value` */
  lt(value: JqlOperand): JqlBuilder {
    return this.add(this.target.lt(value));
  }

  /** `field <= value` */
  lte(value: JqlOperand): JqlBuilder {
    return this.add(this.target.lte(value));
  }

  /** `field ~ value` */
  contains(value: JqlOperand): JqlBuilder {
    return this.add(this.target.contains(value));
  }

  /** `field !~ value` */
  notContains(value: JqlOperand): JqlBuilder {
    return this.add(this.target.notContains(value));
  }

  /** `field IN (a, b, …)` */
  in(...values: Array<JqlOperand | JqlOperand[]>): JqlBuilder {
    return this.add(this.target.in(...values));
  }

  /** `field NOT IN (a, b, …)` */
  notIn(...values: Array<JqlOperand | JqlOperand[]>): JqlBuilder {
    return this.add(this.target.notIn(...values));
  }

  /** `field IS EMPTY` */
  isEmpty(): JqlBuilder {
    return this.add(this.target.isEmpty());
  }

  /** `field IS NOT EMPTY` */
  isNotEmpty(): JqlBuilder {
    return this.add(this.target.isNotEmpty());
  }

  /** `field WAS value [predicates]` */
  was(value: JqlOperand, predicates?: JqlHistoryPredicates): JqlBuilder {
    return this.add(this.target.was(value, predicates));
  }

  /** `field WAS NOT value [predicates]` */
  wasNot(value: JqlOperand, predicates?: JqlHistoryPredicates): JqlBuilder {
    return this.add(this.target.wasNot(value, predicates));
  }

  /** `field WAS IN (a, b, …) [predicates]` */
  wasIn(values: JqlOperand[], predicates?: JqlHistoryPredicates): JqlBuilder {
    return this.add(this.target.wasIn(values, predicates));
  }

  /** `field WAS NOT IN (a, b, …) [predicates]` */
  wasNotIn(values: JqlOperand[], predicates?: JqlHistoryPredicates): JqlBuilder {
    return this.add(this.target.wasNotIn(values, predicates));
  }

  /** `field CHANGED [predicates]` */
  changed(predicates?: JqlHistoryPredicates): JqlBuilder {
    return this.add(this.target.changed(predicates));
  }
}

/**
 * Fluent, chainable JQL query builder. Create one with {@link jql}.
 *
 * Clauses are joined with `AND` by default; use {@link JqlBuilder.or} /
 * {@link JqlBuilder.orField} for `OR`, and the standalone {@link and} /
 * {@link or} / {@link not} combinators for explicit grouping.
 *
 * @example
 * ```typescript
 * import { jql, or, field, JqlFunctions } from 'jira-datacenter-api-client';
 *
 * const query = jql()
 *   .project('OPS')
 *   .status('Open', 'In Progress')
 *   .field('assignee').eq(JqlFunctions.currentUser())
 *   .field('updated').gte('-7d')
 *   .where(or(field('priority').eq('High'), field('labels').eq('urgent')))
 *   .orderBy('updated', 'DESC')
 *   .build();
 * // project = "OPS" AND status IN ("Open", "In Progress") AND assignee = currentUser()
 * //   AND updated >= "-7d" AND (priority = "High" OR labels = "urgent") ORDER BY updated DESC
 * ```
 */
export class JqlBuilder {
  private readonly clauses: Array<{ connector: 'AND' | 'OR'; clause: JqlClause }> = [];
  private readonly sorts: Array<{ field: string; direction: JqlSortDirection }> = [];

  private append(connector: 'AND' | 'OR', input: JqlClauseInput): this {
    this.clauses.push({ connector, clause: toClause(input) });
    return this;
  }

  /** Adds a clause joined with `AND`. Alias of {@link JqlBuilder.and}. */
  where(clause: JqlClauseInput): this {
    return this.append('AND', clause);
  }

  /** Adds a clause joined with `AND`. */
  and(clause: JqlClauseInput): this {
    return this.append('AND', clause);
  }

  /** Adds a clause joined with `OR`. */
  or(clause: JqlClauseInput): this {
    return this.append('OR', clause);
  }

  /** Starts a condition on a field, joined with `AND`. */
  field(name: string): JqlBoundField {
    return new JqlBoundField(this, new JqlField(name), 'AND');
  }

  /** Starts a condition on a field, joined with `OR`. */
  orField(name: string): JqlBoundField {
    return new JqlBoundField(this, new JqlField(name), 'OR');
  }

  private shorthand(name: string, values: JqlOperand[]): this {
    const target = new JqlField(name);
    if (values.length === 0) {
      throw new TypeError(`${name}() requires at least one value`);
    }
    return this.and(values.length === 1 ? target.eq(values[0]) : target.in(values));
  }

  /** `project = X` (or `project IN (…)` with multiple values). */
  project(...keys: JqlOperand[]): this {
    return this.shorthand('project', keys);
  }

  /** `status = X` (or `status IN (…)` with multiple values). */
  status(...statuses: JqlOperand[]): this {
    return this.shorthand('status', statuses);
  }

  /** `issuetype = X` (or `issuetype IN (…)` with multiple values). */
  type(...types: JqlOperand[]): this {
    return this.shorthand('issuetype', types);
  }

  /** `assignee = X` — accepts a username or a JQL function such as `currentUser()`. */
  assignee(...users: JqlOperand[]): this {
    return this.shorthand('assignee', users);
  }

  /** `reporter = X` — accepts a username or a JQL function such as `currentUser()`. */
  reporter(...users: JqlOperand[]): this {
    return this.shorthand('reporter', users);
  }

  /** `priority = X` (or `priority IN (…)` with multiple values). */
  priority(...priorities: JqlOperand[]): this {
    return this.shorthand('priority', priorities);
  }

  /** `labels = X` (or `labels IN (…)` with multiple values). */
  labels(...labels: JqlOperand[]): this {
    return this.shorthand('labels', labels);
  }

  /** `component = X` (or `component IN (…)` with multiple values). */
  component(...components: JqlOperand[]): this {
    return this.shorthand('component', components);
  }

  /** `fixVersion = X` (or `fixVersion IN (…)` with multiple values). */
  fixVersion(...versions: JqlOperand[]): this {
    return this.shorthand('fixVersion', versions);
  }

  /** `sprint = X` — accepts an ID, a name, or a function like `openSprints()`. */
  sprint(...sprints: JqlOperand[]): this {
    return this.shorthand('sprint', sprints);
  }

  /** `text ~ value` — full-text search across summary, description, comments, etc. */
  text(value: JqlOperand): this {
    return this.and(new JqlField('text').contains(value));
  }

  /**
   * Appends an `ORDER BY` field. Call multiple times for multi-field sorts.
   *
   * @param name - The field to sort by (quoted automatically when required)
   * @param direction - `'ASC'` (default) or `'DESC'`
   */
  orderBy(name: string, direction: JqlSortDirection = 'ASC'): this {
    this.sorts.push({ field: formatJqlField(name), direction });
    return this;
  }

  /**
   * Renders the final JQL string. An empty builder produces an empty string
   * (which Jira treats as "all issues").
   */
  build(): string {
    let query = '';
    const wrapComposites = this.clauses.length > 1;
    for (const { connector, clause } of this.clauses) {
      const isComposite = clause instanceof LogicalClause || clause instanceof RawClause;
      const rendered = wrapComposites && isComposite ? `(${clause.toJql()})` : clause.toJql();
      query = query.length === 0 ? rendered : `${query} ${connector} ${rendered}`;
    }
    if (this.sorts.length > 0) {
      const orderBy = this.sorts.map((sort) => `${sort.field} ${sort.direction}`).join(', ');
      query = query.length === 0 ? `ORDER BY ${orderBy}` : `${query} ORDER BY ${orderBy}`;
    }
    return query;
  }

  /** Renders the final JQL string. Equivalent to {@link JqlBuilder.build}. */
  toString(): string {
    return this.build();
  }
}

/** Values accepted by the `jql` tagged template. Arrays render as JQL lists: `("a", "b")`. */
export type JqlTemplateValue = JqlOperand | JqlClause | JqlBuilder | ReadonlyArray<string | number>;

/** @internal */
function renderTemplateValue(value: JqlTemplateValue): string {
  if (value === null || value === undefined) {
    throw new TypeError('JQL template values must not be null or undefined');
  }
  if (value instanceof JqlClause || value instanceof JqlBuilder) return value.toString();
  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new TypeError('JQL template list values must not be empty');
    }
    return `(${value.map((item: string | number) => formatJqlOperand(item)).join(', ')})`;
  }
  return formatJqlOperand(value as JqlOperand);
}

/**
 * Creates a new {@link JqlBuilder}, or — when used as a tagged template —
 * renders a JQL string with all interpolated values safely escaped.
 *
 * Template interpolation rules:
 * - `string` → quoted and escaped (safe against JQL injection)
 * - `number` → inserted bare
 * - `Date` → `"yyyy-MM-dd HH:mm"` literal
 * - arrays → JQL lists: `("a", "b", 3)`
 * - {@link JqlRaw} / clauses / builders → inserted verbatim
 *
 * @example
 * ```typescript
 * // Builder mode
 * const q1 = jql().project('OPS').status('Open').build();
 *
 * // Tagged-template mode (userInput is escaped automatically)
 * const q2 = jql`project = ${projectKey} AND summary ~ ${userInput}`;
 * const q3 = jql`status IN ${['Open', 'Reopened']} AND assignee = ${JqlFunctions.currentUser()}`;
 * ```
 */
export function jql(): JqlBuilder;
export function jql(strings: TemplateStringsArray, ...values: JqlTemplateValue[]): string;
export function jql(strings?: TemplateStringsArray, ...values: JqlTemplateValue[]): JqlBuilder | string {
  if (strings === undefined) {
    return new JqlBuilder();
  }
  let query = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    query += renderTemplateValue(values[i]) + strings[i + 1];
  }
  return query.trim();
}
