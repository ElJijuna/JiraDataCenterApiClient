/**
 * A Jira project version (release).
 */
export interface JiraVersion {
  /** URL of the version resource */
  self?: string;
  /** Numeric string ID */
  id?: string;
  /** Version name */
  name: string;
  /** Version description */
  description?: string;
  /** Whether this version has been archived */
  archived?: boolean;
  /** Whether this version has been released */
  released?: boolean;
  /** Release date in `YYYY-MM-DD` format */
  releaseDate?: string;
  /** Whether the release date is overdue */
  overdue?: boolean;
  /** User-facing release date string */
  userReleaseDate?: string;
  /** Project ID this version belongs to */
  projectId?: number;
}

/**
 * Issue counts associated with a version.
 */
export interface JiraVersionIssueCounts {
  /** URL of the resource */
  self: string;
  /** Number of issues that use this version in the fixVersions field */
  issuesFixedCount: number;
  /** Number of issues that use this version in the affectedVersions field */
  issuesAffectedCount: number;
  /** Number of issues with a Fix Version of this version whose status is done */
  issueCountWithCustomFieldsShowingVersion: number;
  /** URL to query for a custom field showing this version */
  customFieldUsage: Array<{ fieldName: string; customFieldId: number; issueCountWithVersionInCustomField: number }>;
}

/**
 * Unresolved issue count for a version.
 */
export interface JiraVersionUnresolvedIssueCount {
  /** URL of the resource */
  self: string;
  /** Number of unresolved issues fixed in this version */
  issuesUnresolvedCount: number;
}
