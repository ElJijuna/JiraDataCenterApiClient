import type { JiraUser } from './User';
import type { PaginationParams } from './Pagination';

/**
 * Query parameters for listing issue worklogs.
 */
export interface WorklogsParams extends PaginationParams {
  /** Fields to expand */
  expand?: string;
}

/**
 * A worklog entry on a Jira issue.
 */
export interface JiraWorklog {
  /** URL of the worklog resource */
  self: string;
  /** User who created the worklog */
  author?: JiraUser;
  /** User who last updated the worklog */
  updateAuthor?: JiraUser;
  /** Comment / description of work done */
  comment?: string;
  /** ISO 8601 date the worklog was created */
  created: string;
  /** ISO 8601 date the worklog was last updated */
  updated: string;
  /** ISO 8601 date/time when the work was started */
  started: string;
  /** Time spent in Jira notation (e.g. `'3h 30m'`) */
  timeSpent: string;
  /** Time spent in seconds */
  timeSpentSeconds: number;
  /** Numeric string ID of the worklog */
  id: string;
  /** Numeric string ID of the issue */
  issueId: string;
  /** Visibility restriction */
  visibility?: { type: 'role' | 'group'; value: string };
}

/**
 * Paged wrapper returned by `GET /rest/api/latest/issue/{key}/worklog`.
 */
export interface JiraWorklogResponse {
  /** Worklogs in this page */
  worklogs: JiraWorklog[];
  /** Index of the first worklog */
  startAt: number;
  /** Maximum number of worklogs returned */
  maxResults: number;
  /** Total number of worklogs */
  total: number;
}
