/**
 * A single permission entry, as returned by the permissions endpoints.
 */
export interface JiraPermission {
  /** Permission ID */
  id: string;
  /** Permission key (e.g. `'BROWSE_PROJECTS'`) */
  key: string;
  /** Human-readable name */
  name: string;
  /** Permission type (e.g. `'PROJECT'`, `'GLOBAL'`) */
  type?: string;
  /** Description of what the permission allows */
  description?: string;
  /** Whether the authenticated user has this permission (only in `mypermissions`) */
  havePermission?: boolean;
}

/**
 * Response of the permissions endpoints: a map of permission key to entry.
 */
export interface JiraPermissionsResponse {
  permissions: Record<string, JiraPermission>;
}

/**
 * Optional context for `mypermissions` — when provided, project- and
 * issue-level permissions are evaluated against that context.
 */
export interface MyPermissionsParams {
  /** Evaluate permissions in the context of this project key */
  projectKey?: string;
  /** Evaluate permissions in the context of this project ID */
  projectId?: string;
  /** Evaluate permissions in the context of this issue key */
  issueKey?: string;
  /** Evaluate permissions in the context of this issue ID */
  issueId?: string;
}
