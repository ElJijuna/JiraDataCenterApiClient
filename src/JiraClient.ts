import type { JiraAttachment, JiraAttachmentMeta } from './domain/Attachment';
import type { BoardsParams, JiraBoard } from './domain/Board';
import type { JiraCustomFieldOption } from './domain/CustomFieldOption';
import type { DashboardsParams, JiraDashboard, JiraDashboardsResponse } from './domain/Dashboard';
import type { JiraField } from './domain/Field';
import type { JiraFilter, JiraFilterColumn, JiraFilterPermission } from './domain/Filter';
import type {
  GroupMembersParams,
  GroupsPickerParams,
  JiraGroupsPickerResponse,
} from './domain/Group';
import type { JiraIssue, JiraResolution } from './domain/Issue';
import type { JiraIssueLinkType } from './domain/IssueLink';
import type { IssuePickerParams, JiraIssuePickerResponse } from './domain/IssuePicker';
import type { JiraSearchResponse, SearchParams, SearchPostParams } from './domain/IssueSearch';
import type { JiraIssueType } from './domain/IssueType';
import type {
  JiraJqlAutocompleteData,
  JiraJqlSuggestionsResponse,
  JqlSuggestionsParams,
  JqlValidationResult,
} from './domain/Jql';
import type { PagedResponse } from './domain/Pagination';
import type { JiraPermissionsResponse, MyPermissionsParams } from './domain/Permission';
import type { JiraPriority } from './domain/Priority';
import type { JiraProject, ProjectsParams } from './domain/Project';
import type { JiraProjectCategory } from './domain/ProjectCategory';
import type { JiraServerInfo } from './domain/ServerInfo';
import type { JiraStatus, JiraStatusCategory } from './domain/Status';
import type { JiraUser, UserActivityParams, UserSearchParams } from './domain/User';
import type { JiraWorkflow } from './domain/Workflow';
import type {
  JiraWorklog,
  JiraWorklogDeletedResponse,
  JiraWorklogUpdatedResponse,
  WorklogSinceParams,
} from './domain/Worklog';
import { JiraApiError } from './errors/JiraApiError';
import type { JqlBuilder, JqlClause } from './jql/JqlBuilder';
import { quoteJqlString } from './jql/JqlEscape';
import { type PaginateOptions, paginate } from './pagination/paginate';
import { BoardResource } from './resources/BoardResource';
import { EpicResource } from './resources/EpicResource';
import { IssueResource, type RequestFn } from './resources/IssueResource';
import { MetricsResource } from './resources/MetricsResource';
import { ProjectResource } from './resources/ProjectResource';
import { Security } from './security/Security';

/**
 * Payload emitted on every HTTP request made by {@link JiraClient}.
 */
export interface RequestEvent {
  /** Full URL that was requested */
  url: string;
  /** HTTP method used */
  method: 'GET' | 'POST';
  /** Timestamp when the request started */
  startedAt: Date;
  /** Timestamp when the request finished (success or error) */
  finishedAt: Date;
  /** Total duration in milliseconds */
  durationMs: number;
  /** HTTP status code returned by the server, if a response was received */
  statusCode?: number;
  /** Error thrown, if the request failed */
  error?: Error;
}

/**
 * Payload emitted before each retry attempt when retries are configured.
 */
export interface RetryEvent {
  /** Full URL being retried */
  url: string;
  /** HTTP method used */
  method: 'GET' | 'POST';
  /** 1-based retry attempt number (1 = first retry) */
  attempt: number;
  /** Delay before the retry, in milliseconds */
  delayMs: number;
  /** HTTP status code that triggered the retry, when a response was received */
  statusCode?: number;
  /** Error that triggered the retry, for network failures and timeouts */
  error?: Error;
}

/** Map of supported client events to their callback signatures */
export interface JiraClientEvents {
  request: (event: RequestEvent) => void;
  retry: (event: RetryEvent) => void;
}

/**
 * Retry behavior for failed requests. Retries are opt-in: the default
 * configuration performs no retries.
 */
export interface JiraRetryOptions {
  /**
   * Maximum number of retries after the initial attempt.
   * @default 0
   */
  retries?: number;
  /**
   * Base delay for exponential backoff (`baseDelayMs * 2^attempt`).
   * A `Retry-After` response header, when present, takes precedence.
   * @default 300
   */
  baseDelayMs?: number;
  /**
   * Upper bound for any single delay.
   * @default 10000
   */
  maxDelayMs?: number;
  /**
   * HTTP status codes that trigger a retry. Network errors and timeouts
   * are always retried while attempts remain.
   * @default [429, 502, 503, 504]
   */
  retryOn?: number[];
}

/**
 * Constructor options for {@link JiraClient}.
 */
export interface JiraClientOptions {
  /** The host URL of the Jira Data Center instance (e.g., `https://jira.example.com`) */
  apiUrl: string;
  /**
   * The REST API path to prepend to every core request.
   * @default `'rest/api/latest'`
   */
  apiPath?: string;
  /**
   * The Agile (Software) REST API path used for boards and sprints.
   * @default `'rest/agile/latest'`
   */
  agileApiPath?: string;
  /** The username to authenticate with */
  user: string;
  /** The personal access token or password to authenticate with */
  token: string;
  /**
   * Per-request timeout in milliseconds. A request that exceeds it is
   * aborted (and retried, when retries are configured).
   * @default undefined (no timeout)
   */
  timeoutMs?: number;
  /** Retry behavior for failed requests. Off by default. */
  retry?: JiraRetryOptions;
}

/**
 * Main entry point for the Jira Data Center REST API client.
 *
 * @example
 * ```typescript
 * const jira = new JiraClient({
 *   apiUrl: 'https://jira.example.com',
 *   user: 'pilmee',
 *   token: 'my-token',
 * });
 *
 * // Search issues with JQL
 * const results = await jira.search({ jql: 'project = PROJ AND status = Open', maxResults: 50 });
 *
 * // Get a single issue
 * const issue = await jira.issue('PROJ-42');
 *
 * // Get issue comments
 * const comments = await jira.issue('PROJ-42').comments();
 *
 * // Get issue changelog
 * const changelog = await jira.issue('PROJ-42').changelog();
 *
 * // Get a project
 * const project = await jira.project('PROJ');
 *
 * // Get project components
 * const components = await jira.project('PROJ').components();
 *
 * // Get all projects
 * const projects = await jira.projects();
 *
 * // Get a board and its sprints
 * const sprints = await jira.board(42).sprints({ state: 'active' });
 *
 * // Get sprint issues
 * const sprintIssues = await jira.board(42).sprint(10).issues();
 *
 * // Get current user
 * const me = await jira.currentUser();
 * ```
 */
export class JiraClient {
  private readonly security: Security;
  private readonly apiPath: string;
  private readonly agileApiPath: string;
  private readonly timeoutMs?: number;
  private readonly retryConfig: Required<JiraRetryOptions>;
  private readonly listeners: Map<
    keyof JiraClientEvents,
    JiraClientEvents[keyof JiraClientEvents][]
  > = new Map();
  /** Lightweight issue/user/project metrics derived from Jira Data Center REST and JQL. */
  readonly metrics: MetricsResource;

  /**
   * @param options - Connection and authentication options
   * @throws {TypeError} If `apiUrl` is not a valid URL
   */
  constructor({
    apiUrl,
    apiPath = 'rest/api/latest',
    agileApiPath = 'rest/agile/latest',
    user,
    token,
    timeoutMs,
    retry,
  }: JiraClientOptions) {
    this.security = new Security(apiUrl, user, token);
    this.apiPath = apiPath.replace(/^\/|\/$/g, '');
    this.agileApiPath = agileApiPath.replace(/^\/|\/$/g, '');
    this.timeoutMs = timeoutMs;
    this.retryConfig = {
      retries: retry?.retries ?? 0,
      baseDelayMs: retry?.baseDelayMs ?? 300,
      maxDelayMs: retry?.maxDelayMs ?? 10_000,
      retryOn: retry?.retryOn ?? [429, 502, 503, 504],
    };
    this.metrics = new MetricsResource((body) => this.searchPost(body));
  }

  /**
   * Subscribes to a client event.
   *
   * @example
   * ```typescript
   * jira.on('request', (event) => {
   *   console.log(`${event.method} ${event.url} — ${event.durationMs}ms`);
   *   if (event.error) console.error('Request failed:', event.error);
   * });
   * ```
   */
  on<K extends keyof JiraClientEvents>(event: K, callback: JiraClientEvents[K]): this {
    const callbacks = this.listeners.get(event) ?? [];

    callbacks.push(callback);
    this.listeners.set(event, callbacks);

    return this;
  }

  private emit<K extends keyof JiraClientEvents>(
    event: K,
    payload: Parameters<JiraClientEvents[K]>[0],
  ): void {
    const callbacks = this.listeners.get(event) ?? [];

    for (const cb of callbacks) {
      (cb as (p: typeof payload) => void)(payload);
    }
  }

  /**
   * Performs a single `fetch`, retrying retryable failures with exponential
   * backoff when retries are configured. Honors the `Retry-After` response
   * header, the client-level timeout, and the per-request abort signal.
   * @internal
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    method: 'GET' | 'POST',
    signal?: AbortSignal,
  ): Promise<Response> {
    const { retries, baseDelayMs, maxDelayMs, retryOn } = this.retryConfig;

    for (let attempt = 0; ; attempt += 1) {
      if (signal?.aborted) {
        throw toError(signal.reason, 'Request aborted');
      }

      const attemptSignal = composeSignal(this.timeoutMs, signal);

      try {
        const response = await fetch(url, { ...init, signal: attemptSignal.signal });

        if (!response.ok && retryOn.includes(response.status) && attempt < retries) {
          const delayMs = Math.min(
            retryAfterMs(response) ?? baseDelayMs * 2 ** attempt,
            maxDelayMs,
          );

          this.emit('retry', {
            url,
            method,
            attempt: attempt + 1,
            delayMs,
            statusCode: response.status,
          });
          await sleep(delayMs, signal);
          continue;
        }

        return response;
      } catch (err) {
        if (signal?.aborted || attempt >= retries) {
          throw err;
        }

        const delayMs = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);

        this.emit('retry', {
          url,
          method,
          attempt: attempt + 1,
          delayMs,
          error: toError(err, 'Request failed'),
        });
        await sleep(delayMs, signal);
      } finally {
        attemptSignal.cleanup();
      }
    }
  }

  /**
   * Performs an authenticated GET request to the Jira REST API.
   * @internal
   */
  private async request<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    options?: { apiPath?: string; signal?: AbortSignal },
  ): Promise<T> {
    const apiPath = options?.apiPath ?? this.apiPath;
    const base = `${this.security.getApiUrl()}/${apiPath}${path}`;
    const url = buildUrl(base, params);
    const startedAt = new Date();

    let statusCode: number | undefined;

    try {
      const response = await this.fetchWithRetry(
        url,
        { headers: this.security.getHeaders() },
        'GET',
        options?.signal,
      );

      statusCode = response.status;

      if (!response.ok) {
        throw new JiraApiError(
          response.status,
          response.statusText,
          await parseErrorBody(response),
        );
      }

      const data = (await response.json()) as T;

      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        statusCode,
      });

      return data;
    } catch (err) {
      const finishedAt = new Date();

      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
        error: err instanceof Error ? err : new Error(String(err)),
      });

      throw err;
    }
  }

  private async requestPost<T>(
    path: string,
    body: unknown,
    options?: { apiPath?: string; signal?: AbortSignal },
  ): Promise<T> {
    const apiPath = options?.apiPath ?? this.apiPath;
    const url = `${this.security.getApiUrl()}/${apiPath}${path}`;
    const startedAt = new Date();

    let statusCode: number | undefined;

    try {
      const response = await this.fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: this.security.getHeaders(),
          body: JSON.stringify(body),
        },
        'POST',
        options?.signal,
      );

      statusCode = response.status;

      if (!response.ok) {
        throw new JiraApiError(
          response.status,
          response.statusText,
          await parseErrorBody(response),
        );
      }

      const data = (await response.json()) as T;

      this.emit('request', {
        url,
        method: 'POST',
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        statusCode,
      });

      return data;
    } catch (err) {
      const finishedAt = new Date();

      this.emit('request', {
        url,
        method: 'POST',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
        error: err instanceof Error ? err : new Error(String(err)),
      });

      throw err;
    }
  }

  // ─── Issue ───────────────────────────────────────────────────────────────────

  /**
   * Returns an {@link IssueResource} for a given issue key or ID, providing access
   * to issue data and sub-resources (comments, changelog, transitions, etc.).
   *
   * The returned resource can be awaited directly to fetch the issue,
   * or chained to access nested resources.
   *
   * @param issueIdOrKey - The issue key (e.g., `'PROJ-42'`) or numeric ID
   * @returns A chainable issue resource
   *
   * @example
   * ```typescript
   * const issue      = await jira.issue('PROJ-42');
   * const comments   = await jira.issue('PROJ-42').comments();
   * const changelog  = await jira.issue('PROJ-42').changelog();
   * const transitions = await jira.issue('PROJ-42').transitions();
   * ```
   */
  issue(issueIdOrKey: string): IssueResource {
    const requestFn: RequestFn = <T>(
      path: string,
      params?: Record<string, string | number | boolean>,
      options?: { apiPath?: string },
    ) => this.request<T>(path, params, options);

    return new IssueResource(requestFn, issueIdOrKey);
  }

  // ─── Search ──────────────────────────────────────────────────────────────────

  /**
   * Searches for issues using JQL.
   *
   * `GET /rest/api/latest/search`
   *
   * @param params - Optional: `jql`, `startAt`, `maxResults`, `fields`, `expand`, `validateQuery`
   * @returns A search response containing matching issues
   *
   * @example
   * ```typescript
   * const results = await jira.search({
   *   jql: 'project = PROJ AND status = Open ORDER BY created DESC',
   *   maxResults: 50,
   *   fields: 'summary,status,assignee,priority',
   * });
   * ```
   */
  async search(params?: SearchParams): Promise<JiraSearchResponse> {
    return this.request<JiraSearchResponse>(
      '/search',
      params as Record<string, string | number | boolean>,
    );
  }

  // ─── Projects ────────────────────────────────────────────────────────────────

  /**
   * Fetches all projects accessible to the authenticated user.
   *
   * `GET /rest/api/latest/project`
   *
   * @param params - Optional: `expand`, `recent`
   * @returns An array of projects
   */
  async projects(params?: ProjectsParams): Promise<JiraProject[]> {
    return this.request<JiraProject[]>(
      '/project',
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Returns a {@link ProjectResource} for a given project key or ID.
   *
   * The returned resource can be awaited directly to fetch project info,
   * or chained to access nested resources.
   *
   * @param projectIdOrKey - The project key (e.g., `'PROJ'`) or numeric ID
   * @returns A chainable project resource
   *
   * @example
   * ```typescript
   * const project    = await jira.project('PROJ');
   * const components = await jira.project('PROJ').components();
   * const versions   = await jira.project('PROJ').versions();
   * const statuses   = await jira.project('PROJ').statuses();
   * ```
   */
  project(projectIdOrKey: string): ProjectResource {
    const requestFn: RequestFn = <T>(
      path: string,
      params?: Record<string, string | number | boolean>,
      options?: { apiPath?: string },
    ) => this.request<T>(path, params, options);

    return new ProjectResource(requestFn, projectIdOrKey);
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  /**
   * Searches for users.
   *
   * `GET /rest/api/latest/user/search`
   *
   * @param params - Optional: `username`, `startAt`, `maxResults`
   * @returns An array of users
   */
  async users(params?: UserSearchParams): Promise<JiraUser[]> {
    return this.request<JiraUser[]>(
      '/user/search',
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches a single user by username or key.
   *
   * `GET /rest/api/latest/user`
   *
   * @param username - The username (login name) to look up
   * @returns The user object
   *
   * @example
   * ```typescript
   * const user = await jira.user('pilmee');
   * ```
   */
  async user(username: string): Promise<JiraUser> {
    return this.request<JiraUser>('/user', { username });
  }

  /**
   * Fetches the currently authenticated user.
   *
   * `GET /rest/api/latest/myself`
   *
   * @returns The authenticated user object
   *
   * @example
   * ```typescript
   * const me = await jira.currentUser();
   * ```
   */
  async currentUser(): Promise<JiraUser> {
    return this.request<JiraUser>('/myself');
  }

  /**
   * Searches for issues updated by one or more users.
   *
   * This uses Jira's `updatedBy()` JQL function, which is useful for deriving
   * activity from Bitbucket slugs when they match Jira usernames.
   *
   * `POST /rest/api/latest/search`
   *
   * @param usernames - A Jira username, user key, or Bitbucket slug that maps to one
   * @param params - Optional date bounds, extra JQL filters, pagination, and fields
   * @returns A search response containing issues touched by the user(s)
   *
   * @example
   * ```typescript
   * const activity = await jira.userActivity(['pilmee', 'asmith'], {
   *   from: '-30d',
   *   fields: ['summary', 'updated', 'status'],
   * });
   * ```
   */
  async userActivity(
    usernames: string | string[],
    params: UserActivityParams = {},
  ): Promise<JiraSearchResponse> {
    const { from, to, jql, ...searchParams } = params;
    const names = (Array.isArray(usernames) ? usernames : [usernames])
      .map((username) => username.trim())
      .filter((username) => username.length > 0);

    if (names.length === 0) {
      throw new TypeError('At least one username is required to search user activity');
    }

    const activityJql = names
      .map(
        (username) =>
          `issuekey IN updatedBy(${[
            quoteJqlString(username),
            from ? quoteJqlString(from) : undefined,
            to ? quoteJqlString(to) : undefined,
          ]
            .filter(Boolean)
            .join(', ')})`,
      )
      .join(' OR ');
    const combinedJql = jql ? `(${activityJql}) AND (${jql})` : activityJql;

    return this.searchPost({
      ...searchParams,
      jql: combinedJql,
    });
  }

  // ─── Worklogs ────────────────────────────────────────────────────────────────

  /**
   * Fetches worklog IDs updated after a cursor.
   *
   * `GET /rest/api/latest/worklog/updated`
   *
   * Use with {@link worklogsList} to hydrate changed worklogs for activity metrics.
   */
  async worklogsUpdated(params?: WorklogSinceParams): Promise<JiraWorklogUpdatedResponse> {
    return this.request<JiraWorklogUpdatedResponse>(
      '/worklog/updated',
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches worklog IDs deleted after a cursor.
   *
   * `GET /rest/api/latest/worklog/deleted`
   */
  async worklogsDeleted(params?: WorklogSinceParams): Promise<JiraWorklogDeletedResponse> {
    return this.request<JiraWorklogDeletedResponse>(
      '/worklog/deleted',
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches worklogs by ID.
   *
   * `POST /rest/api/latest/worklog/list`
   */
  async worklogsList(ids: Array<string | number>): Promise<JiraWorklog[]> {
    return this.requestPost<JiraWorklog[]>('/worklog/list', { ids: ids.map((id) => Number(id)) });
  }

  // ─── Boards (Agile) ──────────────────────────────────────────────────────────

  /**
   * Fetches all boards accessible to the authenticated user.
   *
   * `GET /rest/agile/latest/board`
   *
   * @param params - Optional: `startAt`, `maxResults`, `type`, `name`, `projectKeyOrId`
   * @returns A paged response of boards
   */
  async boards(params?: BoardsParams): Promise<PagedResponse<JiraBoard>> {
    return this.request<PagedResponse<JiraBoard>>(
      '/board',
      params as Record<string, string | number | boolean>,
      { apiPath: this.agileApiPath },
    );
  }

  /**
   * Returns a {@link BoardResource} for a given board ID.
   *
   * The returned resource can be awaited directly to fetch board info,
   * or chained to access nested resources (sprints, issues, backlog).
   *
   * @param boardId - The numeric board ID
   * @returns A chainable board resource
   *
   * @example
   * ```typescript
   * const board       = await jira.board(42);
   * const sprints     = await jira.board(42).sprints({ state: 'active' });
   * const backlog     = await jira.board(42).backlog({ maxResults: 50 });
   * const sprintIssues = await jira.board(42).sprint(10).issues();
   * ```
   */
  board(boardId: number): BoardResource {
    const requestFn: RequestFn = <T>(
      path: string,
      params?: Record<string, string | number | boolean>,
      options?: { apiPath?: string },
    ) => this.request<T>(path, params, options);

    return new BoardResource(requestFn, this.agileApiPath, boardId);
  }

  /**
   * Returns an {@link EpicResource} for a given epic ID or key (Jira Software).
   *
   * The returned resource can be awaited directly to fetch the epic,
   * or chained to fetch its issues. Pass `'none'` to target issues that
   * belong to no epic (only `.issues()` is valid in that case).
   *
   * @param epicIdOrKey - The epic key (e.g. `'PROJ-10'`), numeric ID, or `'none'`
   * @returns A chainable epic resource
   *
   * @example
   * ```typescript
   * const epic    = await jira.epic('PROJ-10');
   * const issues  = await jira.epic('PROJ-10').issues({ maxResults: 100 });
   * const orphans = await jira.epic('none').issues();
   * ```
   */
  epic(epicIdOrKey: number | string): EpicResource {
    const requestFn: RequestFn = <T>(
      path: string,
      params?: Record<string, string | number | boolean>,
      options?: { apiPath?: string },
    ) => this.request<T>(path, params, options);

    return new EpicResource(requestFn, this.agileApiPath, epicIdOrKey);
  }

  // ─── Instance & Permissions ──────────────────────────────────────────────────

  /**
   * Fetches general information about the Jira instance: version, build,
   * base URL, and server time. Useful as a health check and for detecting
   * the Data Center version.
   *
   * `GET /rest/api/latest/serverInfo`
   *
   * @returns The server info object
   */
  async serverInfo(): Promise<JiraServerInfo> {
    return this.request<JiraServerInfo>('/serverInfo');
  }

  /**
   * Fetches the permissions of the authenticated user, optionally evaluated
   * in the context of a project or issue.
   *
   * `GET /rest/api/latest/mypermissions`
   *
   * @param params - Optional context: `projectKey`, `projectId`, `issueKey`, `issueId`
   * @returns A map of permission key to permission entry with `havePermission`
   *
   * @example
   * ```typescript
   * const { permissions } = await jira.myPermissions({ projectKey: 'PROJ' });
   * if (permissions.BROWSE_PROJECTS?.havePermission) { ... }
   * ```
   */
  async myPermissions(params?: MyPermissionsParams): Promise<JiraPermissionsResponse> {
    return this.request<JiraPermissionsResponse>(
      '/mypermissions',
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches all permissions known to the instance.
   *
   * `GET /rest/api/latest/permissions`
   *
   * @returns A map of permission key to permission entry
   */
  async permissions(): Promise<JiraPermissionsResponse> {
    return this.request<JiraPermissionsResponse>('/permissions');
  }

  // ─── Metadata ────────────────────────────────────────────────────────────────

  /**
   * Fetches all resolutions.
   *
   * `GET /rest/api/latest/resolution`
   *
   * @returns An array of resolutions
   */
  async resolutions(): Promise<JiraResolution[]> {
    return this.request<JiraResolution[]>('/resolution');
  }

  /**
   * Fetches a single resolution by ID.
   *
   * `GET /rest/api/latest/resolution/{id}`
   *
   * @param id - The resolution ID
   * @returns The resolution object
   */
  async resolution(id: string): Promise<JiraResolution> {
    return this.request<JiraResolution>(`/resolution/${id}`);
  }

  /**
   * Fetches all status categories.
   *
   * `GET /rest/api/latest/statuscategory`
   *
   * @returns An array of status categories
   */
  async statusCategories(): Promise<JiraStatusCategory[]> {
    return this.request<JiraStatusCategory[]>('/statuscategory');
  }

  /**
   * Fetches a single status category by ID or key.
   *
   * `GET /rest/api/latest/statuscategory/{idOrKey}`
   *
   * @param idOrKey - The status category ID or key (e.g. `'done'`)
   * @returns The status category object
   */
  async statusCategory(idOrKey: string | number): Promise<JiraStatusCategory> {
    return this.request<JiraStatusCategory>(
      `/statuscategory/${encodeURIComponent(String(idOrKey))}`,
    );
  }

  /**
   * Fetches all project categories.
   *
   * `GET /rest/api/latest/projectCategory`
   *
   * @returns An array of project categories
   */
  async projectCategories(): Promise<JiraProjectCategory[]> {
    return this.request<JiraProjectCategory[]>('/projectCategory');
  }

  /**
   * Fetches a single project category by ID.
   *
   * `GET /rest/api/latest/projectCategory/{id}`
   *
   * @param id - The project category ID
   * @returns The project category object
   */
  async projectCategory(id: string | number): Promise<JiraProjectCategory> {
    return this.request<JiraProjectCategory>(`/projectCategory/${id}`);
  }

  /**
   * Fetches all workflows.
   *
   * `GET /rest/api/latest/workflow`
   *
   * @returns An array of workflows
   */
  async workflows(): Promise<JiraWorkflow[]> {
    return this.request<JiraWorkflow[]>('/workflow');
  }

  /**
   * Fetches a custom field option by ID (a selectable value of a
   * select/radio/checkbox custom field).
   *
   * `GET /rest/api/latest/customFieldOption/{id}`
   *
   * @param id - The option ID
   * @returns The custom field option
   */
  async customFieldOption(id: string | number): Promise<JiraCustomFieldOption> {
    return this.request<JiraCustomFieldOption>(`/customFieldOption/${id}`);
  }

  // ─── Attachments ─────────────────────────────────────────────────────────────

  /**
   * Fetches attachment metadata by ID. The returned object's `content` URL
   * can be used to download the file with the same credentials.
   *
   * `GET /rest/api/latest/attachment/{id}`
   *
   * @param id - The attachment ID
   * @returns The attachment metadata
   */
  async attachment(id: string | number): Promise<JiraAttachment> {
    return this.request<JiraAttachment>(`/attachment/${id}`);
  }

  /**
   * Fetches global attachment settings (whether attachments are enabled and
   * the upload size limit).
   *
   * `GET /rest/api/latest/attachment/meta`
   *
   * @returns The attachment settings
   */
  async attachmentMeta(): Promise<JiraAttachmentMeta> {
    return this.request<JiraAttachmentMeta>('/attachment/meta');
  }

  // ─── Groups ──────────────────────────────────────────────────────────────────

  /**
   * Searches for groups matching a query, as used by group pickers.
   *
   * `GET /rest/api/latest/groups/picker`
   *
   * @param params - Optional: `query`, `exclude`, `maxResults`
   * @returns Matching groups with a total count
   */
  async groupsPicker(params?: GroupsPickerParams): Promise<JiraGroupsPickerResponse> {
    return this.request<JiraGroupsPickerResponse>(
      '/groups/picker',
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches the members of a group.
   *
   * `GET /rest/api/latest/group/member`
   *
   * @param params - `groupname` plus optional `includeInactiveUsers`, `startAt`, `maxResults`
   * @returns A paged response of users
   */
  async groupMembers(params: GroupMembersParams): Promise<PagedResponse<JiraUser>> {
    return this.request<PagedResponse<JiraUser>>(
      '/group/member',
      params as unknown as Record<string, string | number | boolean>,
    );
  }

  // ─── Dashboards ──────────────────────────────────────────────────────────────

  /**
   * Fetches dashboards visible to the authenticated user.
   *
   * `GET /rest/api/latest/dashboard`
   *
   * @param params - Optional: `filter` (`'favourite'` | `'my'`), `startAt`, `maxResults`
   * @returns A paged dashboards response
   */
  async dashboards(params?: DashboardsParams): Promise<JiraDashboardsResponse> {
    return this.request<JiraDashboardsResponse>(
      '/dashboard',
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches a single dashboard by ID.
   *
   * `GET /rest/api/latest/dashboard/{id}`
   *
   * @param id - The dashboard ID
   * @returns The dashboard object
   */
  async dashboard(id: string | number): Promise<JiraDashboard> {
    return this.request<JiraDashboard>(`/dashboard/${id}`);
  }

  // ─── Issue picker ────────────────────────────────────────────────────────────

  /**
   * Fetches issue suggestions matching a query, as used by issue pickers
   * (link dialogs, mention autocomplete).
   *
   * `GET /rest/api/latest/issue/picker`
   *
   * @param params - Optional: `query`, `currentJQL`, `currentIssueKey`, `currentProjectId`, `showSubTasks`, `showSubTaskParent`
   * @returns Suggestion sections with matching issues
   *
   * @example
   * ```typescript
   * const { sections } = await jira.issuePicker({ query: 'timeout', currentJQL: 'project = OPS' });
   * ```
   */
  async issuePicker(params?: IssuePickerParams): Promise<JiraIssuePickerResponse> {
    return this.request<JiraIssuePickerResponse>(
      '/issue/picker',
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches all issue types available to the authenticated user.
   *
   * `GET /rest/api/latest/issuetype`
   *
   * @returns An array of issue types
   */
  async issuetypes(): Promise<JiraIssueType[]> {
    return this.request<JiraIssueType[]>('/issuetype');
  }

  /**
   * Fetches a single issue type by ID.
   *
   * `GET /rest/api/latest/issuetype/{id}`
   *
   * @param id - The issue type ID
   * @returns The issue type object
   */
  async issuetype(id: string): Promise<JiraIssueType> {
    return this.request<JiraIssueType>(`/issuetype/${id}`);
  }

  /**
   * Fetches all priorities.
   *
   * `GET /rest/api/latest/priority`
   *
   * @returns An array of priorities
   */
  async priorities(): Promise<JiraPriority[]> {
    return this.request<JiraPriority[]>('/priority');
  }

  /**
   * Fetches a single priority by ID.
   *
   * `GET /rest/api/latest/priority/{id}`
   *
   * @param id - The priority ID
   * @returns The priority object
   */
  async priority(id: string): Promise<JiraPriority> {
    return this.request<JiraPriority>(`/priority/${id}`);
  }

  /**
   * Fetches all statuses.
   *
   * `GET /rest/api/latest/status`
   *
   * @returns An array of statuses
   */
  async statuses(): Promise<JiraStatus[]> {
    return this.request<JiraStatus[]>('/status');
  }

  /**
   * Fetches a single status by ID or name.
   *
   * `GET /rest/api/latest/status/{idOrName}`
   *
   * @param idOrName - The status ID or name
   * @returns The status object
   */
  async status(idOrName: string): Promise<JiraStatus> {
    return this.request<JiraStatus>(`/status/${encodeURIComponent(idOrName)}`);
  }

  /**
   * Fetches all issue fields (system and custom).
   *
   * `GET /rest/api/latest/field`
   *
   * @returns An array of fields
   */
  async fields(): Promise<JiraField[]> {
    return this.request<JiraField[]>('/field');
  }

  /**
   * Fetches all issue link types.
   *
   * `GET /rest/api/latest/issueLinkType`
   *
   * @returns An object with the list of issue link types
   */
  async issueLinkTypes(): Promise<{ issueLinkTypes: JiraIssueLinkType[] }> {
    return this.request<{ issueLinkTypes: JiraIssueLinkType[] }>('/issueLinkType');
  }

  /**
   * Fetches the authenticated user's favourite filters.
   *
   * `GET /rest/api/latest/filter/favourite`
   *
   * @returns An array of filters
   */
  async favouriteFilters(): Promise<JiraFilter[]> {
    return this.request<JiraFilter[]>('/filter/favourite');
  }

  /**
   * Fetches a single filter by ID.
   *
   * `GET /rest/api/latest/filter/{id}`
   *
   * @param filterId - The numeric filter ID
   * @returns The filter object
   */
  async filter(filterId: string | number): Promise<JiraFilter> {
    return this.request<JiraFilter>(`/filter/${filterId}`);
  }

  /**
   * Fetches the columns configured for a filter's issue navigator view.
   *
   * `GET /rest/api/latest/filter/{id}/columns`
   *
   * @param filterId - The numeric filter ID
   * @returns An array of columns
   */
  async filterColumns(filterId: string | number): Promise<JiraFilterColumn[]> {
    return this.request<JiraFilterColumn[]>(`/filter/${filterId}/columns`);
  }

  /**
   * Fetches the share permissions of a filter.
   *
   * `GET /rest/api/latest/filter/{id}/permission`
   *
   * @param filterId - The numeric filter ID
   * @returns An array of share permissions
   */
  async filterPermissions(filterId: string | number): Promise<JiraFilterPermission[]> {
    return this.request<JiraFilterPermission[]>(`/filter/${filterId}/permission`);
  }

  /**
   * Fetches issues using a `POST` search, which supports larger JQL queries
   * and additional options such as specifying the fields list as an array.
   *
   * `POST /rest/api/latest/search`
   *
   * @param body - Search request body
   * @returns A search response containing matching issues
   *
   * @example
   * ```typescript
   * const results = await jira.searchPost({
   *   jql: 'project = PROJ AND status = Open',
   *   maxResults: 100,
   *   fields: ['summary', 'status', 'assignee'],
   * });
   * ```
   */
  async searchPost(body: SearchPostParams): Promise<JiraSearchResponse> {
    return this.requestPost<JiraSearchResponse>('/search', body);
  }

  /**
   * Iterates over every issue matching a JQL query, fetching pages
   * transparently (via `POST /search`). `startAt`/`maxResults` are managed
   * by the iterator — control the page size and item cap through `options`.
   *
   * @param params - Search body (`jql`, `fields`, `expand`, `validateQuery`)
   * @param options - `pageSize` (default 50), `limit`, `signal`
   * @yields Each matching issue, in order
   *
   * @example
   * ```typescript
   * for await (const issue of jira.searchAll({ jql: 'project = PROJ', fields: ['summary'] })) {
   *   console.log(issue.key);
   * }
   *
   * // Cap the total and page size
   * const issues = await Array.fromAsync(jira.searchAll({ jql }, { pageSize: 100, limit: 500 }));
   * ```
   */
  searchAll(
    params: Omit<SearchPostParams, 'startAt' | 'maxResults'> = {},
    options?: PaginateOptions,
  ): AsyncGenerator<JiraIssue, void, undefined> {
    return paginate<JiraIssue>(async (startAt, maxResults) => {
      const page = await this.requestPost<JiraSearchResponse>(
        '/search',
        { ...params, startAt, maxResults },
        { signal: options?.signal },
      );

      return { items: page.issues, total: page.total };
    }, options);
  }

  /**
   * Iterates over all boards accessible to the user, fetching pages
   * transparently.
   *
   * @param params - Optional board filters (`type`, `name`, `projectKeyOrId`)
   * @param options - `pageSize` (default 50), `limit`, `signal`
   * @yields Each board, in order
   */
  boardsAll(
    params: Omit<BoardsParams, 'startAt' | 'maxResults'> = {},
    options?: PaginateOptions,
  ): AsyncGenerator<JiraBoard, void, undefined> {
    return paginate<JiraBoard>(async (startAt, maxResults) => {
      const page = await this.request<PagedResponse<JiraBoard>>(
        '/board',
        { ...params, startAt, maxResults },
        { apiPath: this.agileApiPath, signal: options?.signal },
      );

      return { items: page.values, total: page.total, isLast: page.isLast };
    }, options);
  }

  /**
   * Iterates over all users matching a search, fetching pages transparently.
   * The user search endpoint returns bare arrays, so iteration stops when a
   * page comes back shorter than the page size.
   *
   * @param params - Optional: `username`
   * @param options - `pageSize` (default 50), `limit`, `signal`
   * @yields Each user, in order
   */
  usersAll(
    params: Omit<UserSearchParams, 'startAt' | 'maxResults'> = {},
    options?: PaginateOptions,
  ): AsyncGenerator<JiraUser, void, undefined> {
    return paginate<JiraUser>(async (startAt, maxResults) => {
      const page = await this.request<JiraUser[]>(
        '/user/search',
        { ...params, startAt, maxResults },
        { signal: options?.signal },
      );

      return { items: page };
    }, options);
  }

  /**
   * Iterates over every member of a group, fetching pages transparently.
   *
   * @param params - `groupname` plus optional `includeInactiveUsers`
   * @param options - `pageSize` (default 50), `limit`, `signal`
   * @yields Each member, in order
   */
  groupMembersAll(
    params: Omit<GroupMembersParams, 'startAt' | 'maxResults'>,
    options?: PaginateOptions,
  ): AsyncGenerator<JiraUser, void, undefined> {
    return paginate<JiraUser>(async (startAt, maxResults) => {
      const page = await this.request<PagedResponse<JiraUser>>(
        '/group/member',
        { ...params, startAt, maxResults },
        { signal: options?.signal },
      );

      return { items: page.values, total: page.total, isLast: page.isLast };
    }, options);
  }

  // ─── JQL ─────────────────────────────────────────────────────────────────────

  /**
   * Fetches JQL reference data from the instance: every visible field
   * (including custom fields) with its supported operators, every available
   * JQL function, and the reserved words list. Useful for building or
   * validating JQL against the real instance configuration.
   *
   * `GET /rest/api/latest/jql/autocompletedata`
   *
   * @returns Fields, functions, and reserved words available for JQL
   */
  async jqlAutocompleteData(): Promise<JiraJqlAutocompleteData> {
    return this.request<JiraJqlAutocompleteData>('/jql/autocompletedata');
  }

  /**
   * Fetches value suggestions for a JQL field, as used by the Jira issue
   * navigator autocomplete.
   *
   * `GET /rest/api/latest/jql/autocompletedata/suggestions`
   *
   * @param params - `fieldName` plus optional `fieldValue`, `predicateName`, `predicateValue`
   * @returns Matching suggestions
   *
   * @example
   * ```typescript
   * const { results } = await jira.jqlAutocompleteSuggestions({
   *   fieldName: 'status',
   *   fieldValue: 'Op',
   * });
   * ```
   */
  async jqlAutocompleteSuggestions(
    params: JqlSuggestionsParams,
  ): Promise<JiraJqlSuggestionsResponse> {
    return this.request<JiraJqlSuggestionsResponse>(
      '/jql/autocompletedata/suggestions',
      params as unknown as Record<string, string | number | boolean>,
    );
  }

  /**
   * Validates a JQL query against the server without fetching any issues
   * (`validateQuery=true`, `maxResults=0`). This is authoritative validation:
   * it catches unknown fields, bad values, and syntax errors, unlike the
   * heuristic local `lintJql()`.
   *
   * `GET /rest/api/latest/search`
   *
   * @param query - The JQL to validate: a string, a `JqlBuilder`, or a clause
   * @returns `{ valid: true, errors: [] }` or `{ valid: false, errors: [...] }`
   *
   * @example
   * ```typescript
   * const result = await jira.validateJql(jql().project('OPS').status('Open'));
   * if (!result.valid) console.error(result.errors);
   * ```
   */
  async validateJql(query: string | JqlBuilder | JqlClause): Promise<JqlValidationResult> {
    try {
      await this.request<JiraSearchResponse>('/search', {
        jql: query.toString(),
        maxResults: 0,
        validateQuery: true,
      });

      return { valid: true, errors: [] };
    } catch (err) {
      if (err instanceof JiraApiError && err.status === 400) {
        return {
          valid: false,
          errors: err.errorMessages.length > 0 ? err.errorMessages : [err.message],
        };
      }

      throw err;
    }
  }

  // ─── Components & Versions ───────────────────────────────────────────────────

  /**
   * Fetches a single component by ID.
   *
   * `GET /rest/api/latest/component/{id}`
   *
   * @param componentId - The component ID
   * @returns The component object
   */
  async component(componentId: string): Promise<import('./domain/Component').JiraComponent> {
    return this.request<import('./domain/Component').JiraComponent>(`/component/${componentId}`);
  }

  /**
   * Fetches a single version by ID.
   *
   * `GET /rest/api/latest/version/{id}`
   *
   * @param versionId - The version ID
   * @returns The version object
   */
  async version(versionId: string): Promise<import('./domain/Version').JiraVersion> {
    return this.request<import('./domain/Version').JiraVersion>(`/version/${versionId}`);
  }

  /**
   * Fetches the related issue counts for a version.
   *
   * `GET /rest/api/latest/version/{id}/relatedIssueCounts`
   *
   * @param versionId - The version ID
   * @returns Issue counts by type
   */
  async versionIssueCounts(
    versionId: string,
  ): Promise<import('./domain/Version').JiraVersionIssueCounts> {
    return this.request<import('./domain/Version').JiraVersionIssueCounts>(
      `/version/${versionId}/relatedIssueCounts`,
    );
  }

  /**
   * Fetches the number of unresolved issues for a version.
   *
   * `GET /rest/api/latest/version/{id}/unresolvedIssueCount`
   *
   * @param versionId - The version ID
   * @returns The unresolved issue count
   */
  async versionUnresolvedIssueCount(
    versionId: string,
  ): Promise<import('./domain/Version').JiraVersionUnresolvedIssueCount> {
    return this.request<import('./domain/Version').JiraVersionUnresolvedIssueCount>(
      `/version/${versionId}/unresolvedIssueCount`,
    );
  }
}

/**
 * Appends query parameters to a URL string, skipping `undefined` values.
 * @internal
 */
function buildUrl(base: string, params?: Record<string, string | number | boolean>): string {
  if (!params) {
    return base;
  }

  const entries = Object.entries(params).filter(([, v]) => v !== undefined);

  if (entries.length === 0) {
    return base;
  }

  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));

  return `${base}?${search.toString()}`;
}

/**
 * Attempts to parse the JSON body of an error response, returning `undefined`
 * when the body is missing or not JSON.
 * @internal
 */
async function parseErrorBody(response: { json(): Promise<unknown> }): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** @internal */
function toError(reason: unknown, fallback: string): Error {
  if (reason instanceof Error) {
    return reason;
  }

  if (typeof reason === 'string' && reason.length > 0) {
    return new Error(reason);
  }

  return new Error(fallback);
}

/**
 * Parses the `Retry-After` response header (seconds), returning `undefined`
 * when absent or unparsable. Tolerates mock responses without headers.
 * @internal
 */
function retryAfterMs(response: Response): number | undefined {
  const raw =
    typeof response.headers?.get === 'function' ? response.headers.get('retry-after') : null;

  if (raw === null || raw === undefined) {
    return undefined;
  }

  const seconds = Number(raw);

  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

/**
 * Builds the per-attempt abort signal from the client timeout and the
 * caller's signal. Returns a cleanup function that must run after the attempt.
 * @internal
 */
function composeSignal(
  timeoutMs?: number,
  outer?: AbortSignal,
): { signal?: AbortSignal; cleanup: () => void } {
  if (timeoutMs === undefined && outer === undefined) {
    return { signal: undefined, cleanup: () => undefined };
  }

  const controller = new AbortController();
  const onOuterAbort = (): void => controller.abort(outer?.reason);

  let timer: ReturnType<typeof setTimeout> | undefined;

  if (timeoutMs !== undefined) {
    timer = setTimeout(
      () => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  }

  if (outer) {
    /* istanbul ignore if -- defensive: fetchWithRetry rejects aborted signals before composing */
    if (outer.aborted) {
      onOuterAbort();
    } else {
      outer.addEventListener('abort', onOuterAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      outer?.removeEventListener('abort', onOuterAbort);
    },
  };
}

/**
 * Waits for the given delay, rejecting immediately if the signal aborts.
 * @internal
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(toError(signal.reason, 'Request aborted'));

      return;
    }

    const onAbort = (): void => {
      clearTimeout(timer);
      reject(toError(signal?.reason, 'Request aborted'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
