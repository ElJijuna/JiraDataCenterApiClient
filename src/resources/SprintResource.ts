import type { JiraSprint } from '../domain/Sprint';
import type { JiraSearchResponse } from '../domain/IssueSearch';
import type { BoardIssuesParams } from '../domain/Board';
import type { RequestFn } from './IssueResource';

/**
 * Represents a Jira Software sprint resource.
 *
 * Implements `PromiseLike<JiraSprint>` so it can be awaited directly
 * to fetch the sprint, while also exposing sub-resource methods.
 *
 * @example
 * ```typescript
 * // Await directly to get sprint info
 * const sprint = await jiraClient.board(42).sprint(10);
 *
 * // Get sprint issues
 * const issues = await jiraClient.board(42).sprint(10).issues({ maxResults: 50 });
 * ```
 */
export class SprintResource implements PromiseLike<JiraSprint> {
  private readonly basePath: string;

  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly agileApiPath: string,
    sprintId: number,
  ) {
    this.basePath = `/sprint/${sprintId}`;
  }

  /**
   * Allows the resource to be awaited directly, resolving with the sprint.
   * Delegates to {@link SprintResource.get}.
   */
  then<TResult1 = JiraSprint, TResult2 = never>(
    onfulfilled?: ((value: JiraSprint) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches the sprint details.
   *
   * `GET /rest/agile/latest/sprint/{sprintId}`
   *
   * @returns The sprint object
   */
  async get(): Promise<JiraSprint> {
    return this.request<JiraSprint>(this.basePath, undefined, { apiPath: this.agileApiPath });
  }

  /**
   * Fetches issues in this sprint.
   *
   * `GET /rest/agile/latest/sprint/{sprintId}/issue`
   *
   * @param params - Optional: `startAt`, `maxResults`, `jql`, `fields`, `expand`
   * @returns A search response containing the sprint's issues
   */
  async issues(params?: BoardIssuesParams): Promise<JiraSearchResponse> {
    return this.request<JiraSearchResponse>(
      `${this.basePath}/issue`,
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }
}
