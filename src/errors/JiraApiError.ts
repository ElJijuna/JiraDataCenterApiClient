/**
 * Thrown when the Jira Data Center API returns a non-2xx response.
 *
 * @example
 * ```typescript
 * import { JiraApiError } from 'jira-datacenter-api-client';
 *
 * try {
 *   await jira.issue('NONEXISTENT-1');
 * } catch (err) {
 *   if (err instanceof JiraApiError) {
 *     console.log(err.status);     // 404
 *     console.log(err.statusText); // 'Not Found'
 *     console.log(err.message);    // 'Jira API error: 404 Not Found'
 *   }
 * }
 * ```
 */
export class JiraApiError extends Error {
  /** HTTP status code (e.g. `404`, `401`, `403`) */
  readonly status: number;
  /** HTTP status text (e.g. `'Not Found'`, `'Unauthorized'`) */
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`Jira API error: ${status} ${statusText}`);
    this.name = 'JiraApiError';
    this.status = status;
    this.statusText = statusText;
  }
}
