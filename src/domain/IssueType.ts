/**
 * A Jira issue type (e.g. Story, Bug, Task, Epic).
 */
export interface JiraIssueType {
  /** URL of the issue type resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** Issue type name */
  name: string;
  /** Issue type description */
  description?: string;
  /** URL of the issue type icon */
  iconUrl?: string;
  /** Whether this issue type is a sub-task */
  subtask: boolean;
  /** Hierarchy level (0 = standard, -1 = subtask, 1 = epic) */
  hierarchyLevel?: number;
  /** Avatar ID for this issue type */
  avatarId?: number;
}
