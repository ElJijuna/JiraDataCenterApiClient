import type { JiraEpic } from '../domain/Epic';
import type { BoardIssuesParams } from '../domain/Board';
import type { JiraSearchResponse } from '../domain/IssueSearch';
import type { JiraIssue } from '../domain/Issue';
import type { RequestFn } from './IssueResource';
import type { PaginateOptions } from '../pagination/paginate';
import { paginateIssues } from './BoardResource';

/**
 * Represents a Jira Software epic resource with chainable async methods.
 *
 * Implements `PromiseLike<JiraEpic>` so it can be awaited directly
 * to fetch the epic, while also exposing its issues.
 *
 * Pass `'none'` as the epic ID to target issues that do not belong to any
 * epic (only {@link EpicResource.issues} is valid in that case).
 *
 * @example
 * ```typescript
 * // Await directly to get epic info
 * const epic = await jiraClient.epic('PROJ-10');
 *
 * // Get the epic's issues
 * const issues = await jiraClient.epic('PROJ-10').issues({ maxResults: 100 });
 *
 * // Get issues without an epic
 * const orphans = await jiraClient.epic('none').issues();
 * ```
 */
export class EpicResource implements PromiseLike<JiraEpic> {
  private readonly basePath: string;

  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly agileApiPath: string,
    epicIdOrKey: number | string,
  ) {
    this.basePath = `/epic/${epicIdOrKey}`;
  }

  /**
   * Allows the resource to be awaited directly, resolving with the epic.
   * Delegates to {@link EpicResource.get}.
   */
  then<TResult1 = JiraEpic, TResult2 = never>(
    onfulfilled?: ((value: JiraEpic) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches the epic details.
   *
   * `GET /rest/agile/latest/epic/{epicIdOrKey}`
   *
   * @returns The epic object
   */
  async get(): Promise<JiraEpic> {
    return this.request<JiraEpic>(this.basePath, undefined, { apiPath: this.agileApiPath });
  }

  /**
   * Fetches the issues that belong to this epic (or, for `epic('none')`,
   * the issues that belong to no epic).
   *
   * `GET /rest/agile/latest/epic/{epicIdOrKey}/issue`
   *
   * @param params - Optional: `startAt`, `maxResults`, `jql`, `fields`, `expand`
   * @returns A search response containing the epic's issues
   */
  async issues(params?: BoardIssuesParams): Promise<JiraSearchResponse> {
    return this.request<JiraSearchResponse>(
      `${this.basePath}/issue`,
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }

  /**
   * Iterates over every issue of this epic (or, for `epic('none')`, every
   * issue without an epic), fetching pages transparently.
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
}
