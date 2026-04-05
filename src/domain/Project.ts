import type { JiraUser } from './User';
import type { JiraIssueType } from './IssueType';
import type { JiraComponent } from './Component';
import type { JiraVersion } from './Version';
import type { JiraStatus } from './Status';

/**
 * Query parameters for listing projects.
 */
export interface ProjectsParams {
  /** Fields to expand (e.g. `'description,lead,issueTypes,url,projectKeys'`) */
  expand?: string;
  /** Filter by project IDs */
  recent?: number;
}

/**
 * A minimal project reference used inside other objects.
 */
export interface JiraProjectRef {
  /** URL of the project resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** Project key */
  key: string;
  /** Project name */
  name: string;
  /** Avatar URLs */
  avatarUrls?: Record<string, string>;
}

/**
 * A Jira project.
 */
export interface JiraProject {
  /** URL of the project resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** Project key (e.g. `'PROJ'`) */
  key: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Project type key (e.g. `'software'`, `'business'`, `'service_desk'`) */
  projectTypeKey?: string;
  /** Whether this is a simplified (next-gen) project */
  simplified?: boolean;
  /** Project lead */
  lead?: JiraUser;
  /** Assignee type for new issues */
  assigneeType?: 'PROJECT_LEAD' | 'UNASSIGNED';
  /** Avatar URLs keyed by size */
  avatarUrls?: Record<string, string>;
  /** Issue types available in this project */
  issueTypes?: JiraIssueType[];
  /** Components defined in this project */
  components?: JiraComponent[];
  /** Versions defined in this project */
  versions?: JiraVersion[];
  /** Project roles keyed by role name, values are role URLs */
  roles?: Record<string, string>;
  /** Project links */
  links?: Record<string, unknown>;
  /** Project URL (homepage) */
  url?: string;
  /** Email used for email-to-issue */
  email?: string;
  /** Whether issues in the project can be viewed by anonymous users */
  isPrivate?: boolean;
}

/**
 * A status entry returned by `GET /rest/api/latest/project/{key}/statuses`.
 */
export interface JiraProjectStatus {
  /** URL of the issue type resource */
  self: string;
  /** Issue type ID */
  id: string;
  /** Issue type name */
  name: string;
  /** Whether the issue type is a subtask */
  subtask: boolean;
  /** Statuses available for this issue type */
  statuses: JiraStatus[];
}

/**
 * A role in a Jira project.
 */
export interface JiraProjectRole {
  /** URL of the role resource */
  self: string;
  /** Role name */
  name: string;
  /** Numeric role ID */
  id: number;
  /** Role description */
  description?: string;
  /** Actors (users and groups) with this role */
  actors?: JiraProjectRoleActor[];
}

/**
 * An actor (user or group) in a project role.
 */
export interface JiraProjectRoleActor {
  /** Numeric ID */
  id: number;
  /** Display name */
  displayName: string;
  /** Actor type: `'atlassian-user-role-actor'` or `'atlassian-group-role-actor'` */
  type: string;
  /** Actor name (username or group name) */
  name: string;
  /** Avatar URL (for user actors) */
  avatarUrl?: string;
}
