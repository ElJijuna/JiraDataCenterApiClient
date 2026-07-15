import type { JiraIssue } from './Issue';

/**
 * Query parameters for `GET /rest/api/latest/search`.
 */
export interface SearchParams {
  /** JQL query string (e.g. `'project = PROJ AND status = Open ORDER BY created DESC'`) */
  jql?: string;
  /** Index of the first result (0-based) */
  startAt?: number;
  /** Maximum number of results to return. Jira Data Center defaults to 50; the server cap is configurable. */
  maxResults?: number;
  /** Whether Jira should validate the JQL query. */
  validateQuery?: boolean;
  /** Comma-separated list of fields to include.
   * Use `'*all'` for all fields, `'*navigable'` for navigable fields (default). */
  fields?: string;
  /** Fields to expand (e.g. `'changelog,renderedFields,names'`) */
  expand?: string;
}

/**
 * Body for `POST /rest/api/latest/search`.
 */
export interface SearchPostParams {
  /** JQL query string */
  jql?: string;
  /** Index of the first result (0-based) */
  startAt?: number;
  /** Maximum number of results to return. Use `0` for count-only searches. */
  maxResults?: number;
  /** Issue fields to include in the response */
  fields?: string[];
  /** Fields to expand (e.g. `['changelog', 'names']`) */
  expand?: string[];
  /** Whether Jira should validate the JQL query. */
  validateQuery?: boolean;
}

/**
 * Response body from `GET /rest/api/latest/search` or `POST /rest/api/latest/search`.
 */
export interface JiraSearchResponse {
  /** URL used to perform the search */
  expand?: string;
  /** Index of the first result */
  startAt: number;
  /** Maximum number of results requested */
  maxResults: number;
  /** Total number of issues matching the query */
  total: number;
  /** Search result window limit exposed by Jira Data Center. */
  maxResultWindow?: number;
  /** Issues in this page */
  issues: JiraIssue[];
  /** Warning messages from the JQL validator */
  warningMessages?: string[];
  /** Field name → display name mapping (when `expand=names`) */
  names?: Record<string, string>;
}
