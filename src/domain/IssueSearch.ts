import type { JiraIssue } from './Issue';

/**
 * Query parameters for `GET /rest/api/latest/search`.
 */
export interface SearchParams {
  /** JQL query string (e.g. `'project = PROJ AND status = Open ORDER BY created DESC'`) */
  jql?: string;
  /** Index of the first result (0-based) */
  startAt?: number;
  /** Maximum number of results to return (max 50 by default, up to 100) */
  maxResults?: number;
  /** Whether to validate the JQL query (`'strict'`, `'warn'`, `'none'`) */
  validateQuery?: 'strict' | 'warn' | 'none';
  /** Comma-separated list of fields to include.
   * Use `'*all'` for all fields, `'*navigable'` for navigable fields (default). */
  fields?: string;
  /** Fields to expand (e.g. `'changelog,renderedFields,names'`) */
  expand?: string;
  /** List of issue properties to return */
  properties?: string;
  /** Whether to return field IDs instead of field names */
  fieldsByKeys?: boolean;
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
  /** Issues in this page */
  issues: JiraIssue[];
  /** Warning messages from the JQL validator */
  warningMessages?: string[];
  /** Field name → display name mapping (when `expand=names`) */
  names?: Record<string, string>;
}
