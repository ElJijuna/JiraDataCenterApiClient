/**
 * The category a status belongs to (e.g. To Do, In Progress, Done).
 */
export interface JiraStatusCategory {
  /** URL of the status category resource */
  self: string;
  /** Numeric ID */
  id: number;
  /** Machine-readable key (e.g. `'new'`, `'indeterminate'`, `'done'`) */
  key: string;
  /** Human-readable name */
  name: string;
  /** Display color name */
  colorName?: string;
}

/**
 * A Jira workflow status.
 */
export interface JiraStatus {
  /** URL of the status resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** Status name */
  name: string;
  /** Status description */
  description?: string;
  /** URL of the status icon */
  iconUrl?: string;
  /** The category this status belongs to */
  statusCategory?: JiraStatusCategory;
}
