import type { JiraBoard, BoardIssuesParams, JiraBoardConfiguration, JiraBoardProject } from '../domain/Board';
import type { JiraSprint, SprintsParams } from '../domain/Sprint';
import type { JiraSearchResponse } from '../domain/IssueSearch';
import type { PagedResponse, PaginationParams } from '../domain/Pagination';
import type { JiraEpic } from '../domain/Epic';
import type { JiraVersion } from '../domain/Version';
import type { JiraIssue } from '../domain/Issue';
import type { RequestFn } from './IssueResource';
import { SprintResource } from './SprintResource';
import { paginate, type PaginateOptions } from '../pagination/paginate';

/** @internal Pages through a search-shaped endpoint (`total` + `issues`). */
export function paginateIssues(
  request: RequestFn,
  path: string,
  apiPath: string,
  params: Record<string, unknown>,
  options?: PaginateOptions,
): AsyncGenerator<JiraIssue, void, undefined> {
  return paginate<JiraIssue>(async (startAt, maxResults) => {
    const page = await request<JiraSearchResponse>(
      path,
      { ...params, startAt, maxResults } as Record<string, string | number | boolean>,
      { apiPath, signal: options?.signal },
    );
    return { items: page.issues, total: page.total };
  }, options);
}

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
   * Fetches this board's configuration, including columns and estimation field.
   *
   * `GET /rest/agile/latest/board/{boardId}/configuration`
   *
   * Useful for deriving sprint velocity, cycle time, and workflow-column metrics.
   */
  async configuration(): Promise<JiraBoardConfiguration> {
    return this.request<JiraBoardConfiguration>(
      `${this.basePath}/configuration`,
      undefined,
      { apiPath: this.agileApiPath },
    );
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
   * Iterates over every sprint of this board, fetching pages transparently.
   *
   * @param params - Optional: `state`
   * @param options - `pageSize` (default 50), `limit`, `signal`
   * @yields Each sprint, in order
   */
  sprintsAll(
    params: Omit<SprintsParams, 'startAt' | 'maxResults'> = {},
    options?: PaginateOptions,
  ): AsyncGenerator<JiraSprint, void, undefined> {
    return paginate<JiraSprint>(async (startAt, maxResults) => {
      const page = await this.request<PagedResponse<JiraSprint>>(
        `${this.basePath}/sprint`,
        { ...params, startAt, maxResults } as Record<string, string | number | boolean>,
        { apiPath: this.agileApiPath, signal: options?.signal },
      );
      return { items: page.values, total: page.total, isLast: page.isLast };
    }, options);
  }

  /**
   * Iterates over every issue on this board, fetching pages transparently.
   *
   * @param params - Optional: `jql`, `fields`, `expand`
   * @param options - `pageSize` (default 50), `limit`, `signal`
   * @yields Each issue, in order
   */
  issuesAll(
    params: Omit<BoardIssuesParams, 'startAt' | 'maxResults'> = {},
    options?: PaginateOptions,
  ): AsyncGenerator<JiraIssue, void, undefined> {
    return paginateIssues(this.request, `${this.basePath}/issue`, this.agileApiPath, params, options);
  }

  /**
   * Iterates over every backlog issue of this board, fetching pages
   * transparently.
   *
   * @param params - Optional: `jql`, `fields`, `expand`
   * @param options - `pageSize` (default 50), `limit`, `signal`
   * @yields Each backlog issue, in order
   */
  backlogAll(
    params: Omit<BoardIssuesParams, 'startAt' | 'maxResults'> = {},
    options?: PaginateOptions,
  ): AsyncGenerator<JiraIssue, void, undefined> {
    return paginateIssues(this.request, `${this.basePath}/backlog`, this.agileApiPath, params, options);
  }

  /**
   * Iterates over every epic of this board, fetching pages transparently.
   *
   * @param params - Optional: `done`
   * @param options - `pageSize` (default 50), `limit`, `signal`
   * @yields Each epic, in order
   */
  epicsAll(
    params: { done?: boolean } = {},
    options?: PaginateOptions,
  ): AsyncGenerator<JiraEpic, void, undefined> {
    return paginate<JiraEpic>(async (startAt, maxResults) => {
      const page = await this.request<PagedResponse<JiraEpic>>(
        `${this.basePath}/epic`,
        { ...params, startAt, maxResults } as Record<string, string | number | boolean>,
        { apiPath: this.agileApiPath, signal: options?.signal },
      );
      return { items: page.values, total: page.total, isLast: page.isLast };
    }, options);
  }

  /**
   * Fetches the epics associated with this board.
   *
   * `GET /rest/agile/latest/board/{boardId}/epic`
   *
   * @param params - Optional: `startAt`, `maxResults`
   * @returns A paged response of epics
   */
  async epics(params?: PaginationParams & { done?: boolean }): Promise<PagedResponse<JiraEpic>> {
    return this.request<PagedResponse<JiraEpic>>(
      `${this.basePath}/epic`,
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }

  /**
   * Fetches this board's issues that do not belong to any epic.
   *
   * `GET /rest/agile/latest/board/{boardId}/epic/none/issue`
   *
   * @param params - Optional: `startAt`, `maxResults`, `jql`, `fields`, `expand`
   * @returns A search response containing the epic-less issues
   */
  async issuesWithoutEpic(params?: BoardIssuesParams): Promise<JiraSearchResponse> {
    return this.request<JiraSearchResponse>(
      `${this.basePath}/epic/none/issue`,
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }

  /**
   * Fetches this board's issues that belong to a given epic.
   *
   * `GET /rest/agile/latest/board/{boardId}/epic/{epicId}/issue`
   *
   * @param epicId - The numeric epic ID
   * @param params - Optional: `startAt`, `maxResults`, `jql`, `fields`, `expand`
   * @returns A search response containing the epic's issues on this board
   */
  async epicIssues(epicId: number, params?: BoardIssuesParams): Promise<JiraSearchResponse> {
    return this.request<JiraSearchResponse>(
      `${this.basePath}/epic/${epicId}/issue`,
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }

  /**
   * Fetches the projects this board draws issues from.
   *
   * `GET /rest/agile/latest/board/{boardId}/project`
   *
   * @param params - Optional: `startAt`, `maxResults`
   * @returns A paged response of projects
   */
  async projects(params?: PaginationParams): Promise<PagedResponse<JiraBoardProject>> {
    return this.request<PagedResponse<JiraBoardProject>>(
      `${this.basePath}/project`,
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }

  /**
   * Fetches the versions (releases) visible on this board.
   *
   * `GET /rest/agile/latest/board/{boardId}/version`
   *
   * @param params - Optional: `startAt`, `maxResults`, `released`
   * @returns A paged response of versions
   */
  async versions(params?: PaginationParams & { released?: boolean }): Promise<PagedResponse<JiraVersion>> {
    return this.request<PagedResponse<JiraVersion>>(
      `${this.basePath}/version`,
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
