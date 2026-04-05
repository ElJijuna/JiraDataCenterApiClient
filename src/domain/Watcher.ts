import type { JiraUser } from './User';

/**
 * Watcher information for a Jira issue.
 */
export interface JiraWatchers {
  /** URL of the watchers resource */
  self: string;
  /** Whether the authenticated user is watching the issue */
  isWatching: boolean;
  /** Total number of watchers */
  watchCount: number;
  /** Users watching the issue (only returned when expanding watchers) */
  watchers?: JiraUser[];
}
