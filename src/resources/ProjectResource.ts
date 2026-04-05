import type { JiraProject, JiraProjectStatus, JiraProjectRole, ProjectsParams } from '../domain/Project';
import type { JiraComponent } from '../domain/Component';
import type { JiraVersion } from '../domain/Version';
import type { RequestFn } from './IssueResource';

/**
 * Represents a Jira project resource with chainable async methods.
 *
 * Implements `PromiseLike<JiraProject>` so it can be awaited directly
 * to fetch the project, while also exposing sub-resource methods.
 *
 * @example
 * ```typescript
 * // Await directly to get project info
 * const project = await jiraClient.project('PROJ');
 *
 * // Get components
 * const components = await jiraClient.project('PROJ').components();
 *
 * // Get versions
 * const versions = await jiraClient.project('PROJ').versions();
 *
 * // Get statuses per issue type
 * const statuses = await jiraClient.project('PROJ').statuses();
 *
 * // Get project roles
 * const roles = await jiraClient.project('PROJ').roles();
 * ```
 */
export class ProjectResource implements PromiseLike<JiraProject> {
  private readonly basePath: string;

  /** @internal */
  constructor(
    private readonly request: RequestFn,
    projectIdOrKey: string,
  ) {
    this.basePath = `/project/${projectIdOrKey}`;
  }

  /**
   * Allows the resource to be awaited directly, resolving with the project.
   * Delegates to {@link ProjectResource.get}.
   */
  then<TResult1 = JiraProject, TResult2 = never>(
    onfulfilled?: ((value: JiraProject) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches the project details.
   *
   * `GET /rest/api/latest/project/{projectIdOrKey}`
   *
   * @param params - Optional: `expand`
   * @returns The project object
   */
  async get(params?: ProjectsParams): Promise<JiraProject> {
    return this.request<JiraProject>(
      this.basePath,
      params as Record<string, string | number | boolean>,
    );
  }

  /**
   * Fetches the components defined in this project.
   *
   * `GET /rest/api/latest/project/{projectIdOrKey}/components`
   *
   * @returns An array of project components
   */
  async components(): Promise<JiraComponent[]> {
    return this.request<JiraComponent[]>(`${this.basePath}/components`);
  }

  /**
   * Fetches the versions defined in this project.
   *
   * `GET /rest/api/latest/project/{projectIdOrKey}/versions`
   *
   * @param expand - Optional: `'operations'`
   * @returns An array of project versions
   */
  async versions(expand?: string): Promise<JiraVersion[]> {
    return this.request<JiraVersion[]>(
      `${this.basePath}/versions`,
      expand !== undefined ? { expand } : undefined,
    );
  }

  /**
   * Fetches the statuses available in this project, grouped by issue type.
   *
   * `GET /rest/api/latest/project/{projectIdOrKey}/statuses`
   *
   * @returns An array of issue type → statuses mappings
   */
  async statuses(): Promise<JiraProjectStatus[]> {
    return this.request<JiraProjectStatus[]>(`${this.basePath}/statuses`);
  }

  /**
   * Fetches the roles defined in this project.
   *
   * `GET /rest/api/latest/project/{projectIdOrKey}/role`
   *
   * @returns A record mapping role names to their resource URLs
   */
  async roles(): Promise<Record<string, string>> {
    return this.request<Record<string, string>>(`${this.basePath}/role`);
  }

  /**
   * Fetches a single role by ID, including the list of actors.
   *
   * `GET /rest/api/latest/project/{projectIdOrKey}/role/{id}`
   *
   * @param roleId - The numeric role ID
   * @returns The project role object with actors
   */
  async role(roleId: number): Promise<JiraProjectRole> {
    return this.request<JiraProjectRole>(`${this.basePath}/role/${roleId}`);
  }
}
