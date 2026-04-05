/**
 * The type of a link between two Jira issues.
 */
export interface JiraIssueLinkType {
  /** URL of the link type resource */
  self?: string;
  /** Numeric string ID */
  id: string;
  /** Machine-readable name (e.g. `'Blocks'`) */
  name: string;
  /** Inward description (e.g. `'is blocked by'`) */
  inward: string;
  /** Outward description (e.g. `'blocks'`) */
  outward: string;
}

/**
 * A minimal reference to a Jira issue (used inside link objects).
 */
export interface JiraIssueRef {
  /** URL of the issue resource */
  self: string;
  /** Issue key (e.g. `'PROJ-42'`) */
  key: string;
  /** Issue ID */
  id: string;
  /** Basic issue fields */
  fields?: {
    summary: string;
    status?: { name: string; iconUrl?: string };
    priority?: { name: string; iconUrl?: string };
    issuetype?: { name: string; iconUrl?: string; subtask: boolean };
  };
}

/**
 * A link between two Jira issues.
 */
export interface JiraIssueLink {
  /** URL of the link resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** The link type */
  type: JiraIssueLinkType;
  /** The inward linked issue (the issue referenced by the link) */
  inwardIssue?: JiraIssueRef;
  /** The outward linked issue (the issue that is the target of the link) */
  outwardIssue?: JiraIssueRef;
}
