/**
 * A raw JQL fragment that is inserted verbatim (never quoted or escaped).
 *
 * Used to represent JQL function calls (see {@link JqlFunctions}) and
 * hand-written fragments created with {@link raw}.
 *
 * @example
 * ```typescript
 * import { raw, field } from 'jira-datacenter-api-client';
 *
 * field('assignee').eq(raw('currentUser()')).toJql();
 * // assignee = currentUser()
 * ```
 */
export class JqlRaw {
  private readonly jql: string;

  /**
   * @param jql - The raw JQL fragment to insert verbatim
   * @throws {TypeError} If `jql` is not a non-empty string
   */
  constructor(jql: string) {
    if (typeof jql !== 'string' || jql.trim().length === 0) {
      throw new TypeError('Raw JQL must be a non-empty string');
    }

    this.jql = jql.trim();
  }

  /** Returns the raw JQL fragment. */
  toJql(): string {
    return this.jql;
  }

  /** Returns the raw JQL fragment. */
  toString(): string {
    return this.jql;
  }
}

/**
 * Wraps a hand-written JQL fragment so builders and templates insert it
 * verbatim, without quoting or escaping.
 *
 * Use only with trusted input — user-provided values should go through the
 * builder or the `jql` tagged template so they are escaped.
 *
 * @param jql - The raw JQL fragment
 * @returns A {@link JqlRaw} wrapper
 *
 * @example
 * ```typescript
 * jql().where(raw('issuekey IN updatedBy("pilmee")')).build();
 * ```
 */
export function raw(jql: string): JqlRaw {
  return new JqlRaw(jql);
}
