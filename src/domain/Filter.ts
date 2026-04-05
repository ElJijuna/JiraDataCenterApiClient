import type { JiraUser } from './User';

/**
 * A saved Jira filter.
 */
export interface JiraFilter {
  /** URL of the filter resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** Filter name */
  name: string;
  /** Filter description */
  description?: string;
  /** User who created the filter */
  owner?: JiraUser;
  /** The JQL query string */
  jql: string;
  /** URL to view the filter results */
  viewUrl?: string;
  /** URL to the filter REST resource */
  searchUrl?: string;
  /** Whether the filter is a favourite of the authenticated user */
  favourite?: boolean;
  /** Number of users who have marked this filter as a favourite */
  favouritedCount?: number;
  /** Shared permissions */
  sharePermissions?: JiraFilterPermission[];
  /** Subscriptions to this filter */
  subscriptions?: { size: number; items: unknown[] };
}

/**
 * A permission entry for a shared filter.
 */
export interface JiraFilterPermission {
  /** Numeric ID */
  id: number;
  /** Permission type (e.g. `'global'`, `'project'`, `'group'`, `'role'`) */
  type: string;
  /** Project permission details */
  project?: { id: string; key: string; name: string };
  /** Role permission details */
  role?: { id: number; name: string };
  /** Group permission details */
  group?: { name: string };
}
