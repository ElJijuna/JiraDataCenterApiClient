import type { JiraBoard, BoardIssuesParams } from '../domain/Board';
import type { JiraSprint, SprintsParams } from '../domain/Sprint';
import type { JiraSearchResponse } from '../domain/IssueSearch';
import type { PagedResponse } from '../domain/Pagination';
import type { RequestFn } from './IssueResource';
import { SprintResource } from './SprintResource';

/**
 * Represents a Jira Software board resource with chainable async methods.
 *
 * Implements `PromiseLike<JiraBoard>` so it can be awaited directly
 * to fetch the board, while also exposing sub-resource methods.
 *
 * @example
 * ```typescript
 * // Await directly to get board info
 * const board = await jiraClient.board(42);
 *
 * // Get sprints
 * const sprints = await jiraClient.board(42).sprints({ state: 'active' });
 *
 * // Get board issues
 * const issues = await jiraClient.board(42).issues({ jql: 'status = Open' });
 *
 * // Get backlog
 * const backlog = await jiraClient.board(42).backlog({ maxResults: 50 });
 *
 * // Navigate to a sprint
 * const sprint = await jiraClient.board(42).sprint(10);
 * const sprintIssues = await jiraClient.board(42).sprint(10).issues();
 * ```
 */
export class BoardResource implements PromiseLike<JiraBoard> {
  private readonly basePath: string;

  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly agileApiPath: string,
    boardId: number,
  ) {
    this.basePath = `/board/${boardId}`;
  }

  /**
   * Allows the resource to be awaited directly, resolving with the board.
   * Delegates to {@link BoardResource.get}.
   */
  then<TResult1 = JiraBoard, TResult2 = never>(
    onfulfilled?: ((value: JiraBoard) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches the board details.
   *
   * `GET /rest/agile/latest/board/{boardId}`
   *
   * @returns The board object
   */
  async get(): Promise<JiraBoard> {
    return this.request<JiraBoard>(this.basePath, undefined, { apiPath: this.agileApiPath });
  }

  /**
   * Fetches sprints for this board.
   *
   * `GET /rest/agile/latest/board/{boardId}/sprint`
   *
   * @param params - Optional: `startAt`, `maxResults`, `state`
   * @returns A paged response of sprints
   */
  async sprints(params?: SprintsParams): Promise<PagedResponse<JiraSprint>> {
    return this.request<PagedResponse<JiraSprint>>(
      `${this.basePath}/sprint`,
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }

  /**
   * Fetches all issues on this board (across all sprints and the backlog).
   *
   * `GET /rest/agile/latest/board/{boardId}/issue`
   *
   * @param params - Optional: `startAt`, `maxResults`, `jql`, `fields`, `expand`
   * @returns A search response containing the board's issues
   */
  async issues(params?: BoardIssuesParams): Promise<JiraSearchResponse> {
    return this.request<JiraSearchResponse>(
      `${this.basePath}/issue`,
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }

  /**
   * Fetches the backlog issues for this board.
   *
   * `GET /rest/agile/latest/board/{boardId}/backlog`
   *
   * @param params - Optional: `startAt`, `maxResults`, `jql`, `fields`, `expand`
   * @returns A search response containing the backlog issues
   */
  async backlog(params?: BoardIssuesParams): Promise<JiraSearchResponse> {
    return this.request<JiraSearchResponse>(
      `${this.basePath}/backlog`,
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }

  /**
   * Returns a {@link SprintResource} for a given sprint ID.
   *
   * The returned resource can be awaited directly to fetch sprint info,
   * or chained to access sprint issues.
   *
   * @param sprintId - The numeric sprint ID
   * @returns A chainable sprint resource
   *
   * @example
   * ```typescript
   * const sprint       = await jiraClient.board(42).sprint(10);
   * const sprintIssues = await jiraClient.board(42).sprint(10).issues();
   * ```
   */
  sprint(sprintId: number): SprintResource {
    return new SprintResource(this.request, this.agileApiPath, sprintId);
  }
}
