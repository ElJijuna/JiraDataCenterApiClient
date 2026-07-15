/**
 * Query parameters for user search.
 */
export interface UserSearchParams {
  /** Username to search for */
  username?: string;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Index of the first result (0-based) */
  startAt?: number;
}

/**
 * Options for searching issue activity performed by one or more users.
 */
export interface UserActivityParams {
  /**
   * Lower bound for activity time, accepted by Jira's `updatedBy` JQL function.
   * Examples: `'-30d'`, `'2024-01-01'`, `'2024/01/01'`.
   */
  from?: string;
  /**
   * Upper bound for activity time, accepted by Jira's `updatedBy` JQL function.
   * Examples: `'2024-01-31'`, `'2024/01/31'`.
   */
  to?: string;
  /**
   * Additional JQL to combine with the user activity clauses using `AND`.
   * Example: `'project = PROJ AND statusCategory != Done'`.
   */
  jql?: string;
  /** Index of the first result (0-based) */
  startAt?: number;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Issue fields to include in the response */
  fields?: string[];
  /** Fields to expand (e.g. `['changelog']`) */
  expand?: string[];
  /** Whether to validate the JQL query (`'strict'`, `'warn'`, `'none'`) */
  validateQuery?: 'strict' | 'warn' | 'none';
  /** Whether to return field IDs instead of field names */
  fieldsByKeys?: boolean;
  /** Issue properties to include */
  properties?: string[];
}

/**
 * A Jira user.
 */
export interface JiraUser {
  /** URL of the user resource */
  self: string;
  /** Unique key identifying the user */
  key: string;
  /** Username */
  name: string;
  /** Email address */
  emailAddress: string;
  /** Full display name */
  displayName: string;
  /** Whether the user account is active */
  active: boolean;
  /** User's time zone (e.g. `'America/New_York'`) */
  timeZone?: string;
  /** Avatar URLs keyed by size (e.g. `'16x16'`, `'48x48'`) */
  avatarUrls?: Record<string, string>;
  /** Groups the user belongs to */
  groups?: {
    size: number;
    items: Array<{ name: string; self: string }>;
  };
}
