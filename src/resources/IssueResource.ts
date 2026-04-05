import type { JiraIssue, IssueParams } from '../domain/Issue';
import type { JiraComment, JiraCommentResponse, CommentsParams } from '../domain/Comment';
import type { JiraWorklog, JiraWorklogResponse, WorklogsParams } from '../domain/Worklog';
import type { JiraChangelogResponse, ChangelogParams } from '../domain/Changelog';
import type { JiraTransition, TransitionsParams } from '../domain/Transition';
import type { JiraRemoteLink } from '../domain/RemoteLink';
import type { JiraVotes } from '../domain/Vote';
import type { JiraWatchers } from '../domain/Watcher';

/** @internal */
export type RequestFn = <T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  options?: { apiPath?: string },
) => Promise<T>;

/** @internal */
export type RequestBodyFn = <T>(
  path: string,
  body: unknown,
  options?: { apiPath?: string },
) => Promise<T>;

/**
 * Represents a Jira issue resource with chainable async methods.
 *
 * Implements `PromiseLike<JiraIssue>` so it can be awaited directly
 * to fetch the issue, while also exposing sub-resource methods.
 *
 * @example
 * ```typescript
 * // Await directly to get issue info
 * const issue = await jiraClient.issue('PROJ-42');
 *
 * // Get issue with specific fields
 * const issue = await jiraClient.issue('PROJ-42').get({ fields: 'summary,status,assignee' });
 *
 * // Get comments
 * const comments = await jiraClient.issue('PROJ-42').comments();
 *
 * // Get worklogs
 * const worklogs = await jiraClient.issue('PROJ-42').worklogs();
 *
 * // Get changelog
 * const changelog = await jiraClient.issue('PROJ-42').changelog();
 *
 * // Get available transitions
 * const transitions = await jiraClient.issue('PROJ-42').transitions();
 *
 * // Get remote links
 * const remoteLinks = await jiraClient.issue('PROJ-42').remotelinks();
 *
 * // Get votes
 * const votes = await jiraClient.issue('PROJ-42').votes();
 *
 * // Get watchers
 * const watchers = await jiraClient.issue('PROJ-42').watchers();
 * ```
 */
export class IssueResource implements PromiseLike<JiraIssue> {
  private readonly basePath: string;

  /** @internal */
  constructor(
    private readonly request: RequestFn,
    issueIdOrKey: string,
  ) {
    this.basePath = `/issue/${issueIdOrKey}`;
  }

  /**
   * Allows the resource to be awaited directly, resolving with the issue.
   * Delegates to {@link IssueResource.get}.
   */
  then<TResult1 = JiraIssue, TResult2 = never>(
    onfulfilled?: ((value: JiraIssue) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches the issue.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}`
   *
   * @param params - Optional: `fields`, `expand`, `properties`, `updateHistory`
   * @returns The issue object
   */
  async get(params?: IssueParams): Promise<JiraIssue> {
    return this.request<JiraIssue>(
      this.basePath,
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches comments for this issue.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}/comment`
   *
   * @param params - Optional: `startAt`, `maxResults`, `orderBy`, `expand`
   * @returns A paged response of comments
   */
  async comments(params?: CommentsParams): Promise<JiraCommentResponse> {
    return this.request<JiraCommentResponse>(
      `${this.basePath}/comment`,
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches a single comment by ID.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}/comment/{id}`
   *
   * @param commentId - The numeric comment ID
   * @returns The comment object
   */
  async comment(commentId: string | number): Promise<JiraComment> {
    return this.request<JiraComment>(`${this.basePath}/comment/${commentId}`);
  }

  /**
   * Fetches worklogs for this issue.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}/worklog`
   *
   * @param params - Optional: `startAt`, `maxResults`, `expand`
   * @returns A paged response of worklogs
   */
  async worklogs(params?: WorklogsParams): Promise<JiraWorklogResponse> {
    return this.request<JiraWorklogResponse>(
      `${this.basePath}/worklog`,
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches a single worklog by ID.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}/worklog/{id}`
   *
   * @param worklogId - The numeric worklog ID
   * @returns The worklog object
   */
  async worklog(worklogId: string | number): Promise<JiraWorklog> {
    return this.request<JiraWorklog>(`${this.basePath}/worklog/${worklogId}`);
  }

  /**
   * Fetches the changelog for this issue.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}/changelog`
   *
   * @param params - Optional: `startAt`, `maxResults`
   * @returns A paged response of changelog entries
   */
  async changelog(params?: ChangelogParams): Promise<JiraChangelogResponse> {
    return this.request<JiraChangelogResponse>(
      `${this.basePath}/changelog`,
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches the available workflow transitions for this issue.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}/transitions`
   *
   * @param params - Optional: `transitionId`, `expand`, `skipRemoteOnlyCondition`
   * @returns An object containing the list of transitions
   */
  async transitions(params?: TransitionsParams): Promise<{ transitions: JiraTransition[] }> {
    return this.request<{ transitions: JiraTransition[] }>(
      `${this.basePath}/transitions`,
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches the remote links (external URLs) for this issue.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}/remotelink`
   *
   * @param globalId - Optional global ID to filter by a specific remote link
   * @returns An array of remote links
   */
  async remotelinks(globalId?: string): Promise<JiraRemoteLink[]> {
    return this.request<JiraRemoteLink[]>(
      `${this.basePath}/remotelink`,
      globalId !== undefined ? { globalId } : undefined,
    );
  }

  /**
   * Fetches the vote information for this issue.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}/votes`
   *
   * @returns The votes object
   */
  async votes(): Promise<JiraVotes> {
    return this.request<JiraVotes>(`${this.basePath}/votes`);
  }

  /**
   * Fetches the watcher information for this issue.
   *
   * `GET /rest/api/latest/issue/{issueIdOrKey}/watchers`
   *
   * @returns The watchers object
   */
  async watchers(): Promise<JiraWatchers> {
    return this.request<JiraWatchers>(`${this.basePath}/watchers`);
  }
}
