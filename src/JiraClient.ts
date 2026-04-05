import { Security } from './security/Security';
import { JiraApiError } from './errors/JiraApiError';
import { IssueResource, type RequestFn, type RequestBodyFn } from './resources/IssueResource';
import { ProjectResource } from './resources/ProjectResource';
import { BoardResource } from './resources/BoardResource';
import type { JiraIssue } from './domain/Issue';
import type { JiraProject, ProjectsParams } from './domain/Project';
import type { JiraUser, UserSearchParams } from './domain/User';
import type { JiraIssueType } from './domain/IssueType';
import type { JiraPriority } from './domain/Priority';
import type { JiraStatus } from './domain/Status';
import type { JiraField } from './domain/Field';
import type { JiraFilter } from './domain/Filter';
import type { JiraIssueLinkType } from './domain/IssueLink';
import type { JiraBoard, BoardsParams } from './domain/Board';
import type { JiraSearchResponse, SearchParams } from './domain/IssueSearch';
import type { PagedResponse } from './domain/Pagination';

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

/** Map of supported client events to their callback signatures */
export interface JiraClientEvents {
  request: (event: RequestEvent) => void;
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
  private readonly listeners: Map<keyof JiraClientEvents, JiraClientEvents[keyof JiraClientEvents][]> = new Map();

  /**
   * @param options - Connection and authentication options
   * @throws {TypeError} If `apiUrl` is not a valid URL
   */
  constructor({ apiUrl, apiPath = 'rest/api/latest', agileApiPath = 'rest/agile/latest', user, token }: JiraClientOptions) {
    this.security = new Security(apiUrl, user, token);
    this.apiPath = apiPath.replace(/^\/|\/$/g, '');
    this.agileApiPath = agileApiPath.replace(/^\/|\/$/g, '');
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
   * Performs an authenticated GET request to the Jira REST API.
   * @internal
   */
  private async request<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    options?: { apiPath?: string },
  ): Promise<T> {
    const apiPath = options?.apiPath ?? this.apiPath;
    const base = `${this.security.getApiUrl()}/${apiPath}${path}`;
    const url = buildUrl(base, params);
    const startedAt = new Date();
    let statusCode: number | undefined;
    try {
      const response = await fetch(url, { headers: this.security.getHeaders() });
      statusCode = response.status;
      if (!response.ok) {
        throw new JiraApiError(response.status, response.statusText);
      }
      const data = await response.json() as T;
      this.emit('request', { url, method: 'GET', startedAt, finishedAt: new Date(), durationMs: Date.now() - startedAt.getTime(), statusCode });
      return data;
    } catch (err) {
      const finishedAt = new Date();
      this.emit('request', { url, method: 'GET', startedAt, finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime(), statusCode, error: err instanceof Error ? err : new Error(String(err)) });
      throw err;
    }
  }

  private async requestPost<T>(path: string, body: unknown, options?: { apiPath?: string }): Promise<T> {
    const apiPath = options?.apiPath ?? this.apiPath;
    const url = `${this.security.getApiUrl()}/${apiPath}${path}`;
    const startedAt = new Date();
    let statusCode: number | undefined;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.security.getHeaders(),
        body: JSON.stringify(body),
      });
      statusCode = response.status;
      if (!response.ok) {
        throw new JiraApiError(response.status, response.statusText);
      }
      const data = await response.json() as T;
      this.emit('request', { url, method: 'POST', startedAt, finishedAt: new Date(), durationMs: Date.now() - startedAt.getTime(), statusCode });
      return data;
    } catch (err) {
      const finishedAt = new Date();
      this.emit('request', { url, method: 'POST', startedAt, finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime(), statusCode, error: err instanceof Error ? err : new Error(String(err)) });
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

  // ─── Metadata ────────────────────────────────────────────────────────────────

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
  async searchPost(body: {
    jql?: string;
    startAt?: number;
    maxResults?: number;
    fields?: string[];
    expand?: string[];
    validateQuery?: 'strict' | 'warn' | 'none';
    fieldsByKeys?: boolean;
    properties?: string[];
  }): Promise<JiraSearchResponse> {
    return this.requestPost<JiraSearchResponse>('/search', body);
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
  async versionIssueCounts(versionId: string): Promise<import('./domain/Version').JiraVersionIssueCounts> {
    return this.request<import('./domain/Version').JiraVersionIssueCounts>(`/version/${versionId}/relatedIssueCounts`);
  }

  /**
   * Fetches the number of unresolved issues for a version.
   *
   * `GET /rest/api/latest/version/{id}/unresolvedIssueCount`
   *
   * @param versionId - The version ID
   * @returns The unresolved issue count
   */
  async versionUnresolvedIssueCount(versionId: string): Promise<import('./domain/Version').JiraVersionUnresolvedIssueCount> {
    return this.request<import('./domain/Version').JiraVersionUnresolvedIssueCount>(`/version/${versionId}/unresolvedIssueCount`);
  }
}

/**
 * Appends query parameters to a URL string, skipping `undefined` values.
 * @internal
 */
function buildUrl(base: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return base;
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return base;
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `${base}?${search.toString()}`;
}
