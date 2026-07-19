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
 *     console.log(err.status);        // 404
 *     console.log(err.statusText);    // 'Not Found'
 *     console.log(err.message);       // 'Jira API error: 404 Not Found'
 *     console.log(err.errorMessages); // ['Issue Does Not Exist']
 *   }
 * }
 * ```
 */
export class JiraApiError extends Error {
  /** HTTP status code (e.g. `404`, `401`, `403`) */
  readonly status: number;
  /** HTTP status text (e.g. `'Not Found'`, `'Unauthorized'`) */
  readonly statusText: string;
  /** Error messages from the response body's `errorMessages` field, when present */
  readonly errorMessages: string[];
  /** Per-field errors from the response body's `errors` field, when present */
  readonly errors: Record<string, string>;

  /**
   * @param status - HTTP status code
   * @param statusText - HTTP status text
   * @param body - Parsed JSON error body, when the response had one
   */
  constructor(status: number, statusText: string, body?: unknown) {
    super(`Jira API error: ${status} ${statusText}`);
    this.name = 'JiraApiError';
    this.status = status;
    this.statusText = statusText;
    this.errorMessages = [];
    this.errors = {};
    if (body !== null && typeof body === 'object') {
      const { errorMessages, errors } = body as { errorMessages?: unknown; errors?: unknown };
      if (Array.isArray(errorMessages)) {
        this.errorMessages = errorMessages.filter((m): m is string => typeof m === 'string');
      }
      if (errors !== null && typeof errors === 'object') {
        for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
          if (typeof value === 'string') this.errors[key] = value;
        }
      }
    }
  }
}
