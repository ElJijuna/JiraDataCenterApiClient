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
