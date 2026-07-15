/**
 * Date/project filters shared by metrics helpers.
 */
export interface MetricsScope {
  /** Project keys or IDs to restrict the metric to */
  projects?: string[];
  /** Lower date bound accepted by Jira JQL, e.g. `'-30d'` or `'2026-06-01'` */
  from?: string;
  /** Upper date bound accepted by Jira JQL, e.g. `'2026-06-30'` */
  to?: string;
  /** Additional JQL combined with generated metric clauses using `AND` */
  jql?: string;
}

/**
 * Count issues matching JQL.
 */
export interface MetricsCountParams {
  /** JQL to count */
  jql?: string;
  /** Whether Jira should validate the JQL query */
  validateQuery?: boolean;
}

/**
 * Count-only issue metric.
 */
export interface JiraIssueCount {
  /** JQL used for the count */
  jql: string;
  /** Total matching issues */
  total: number;
  /** Search result window limit exposed by Jira Data Center */
  maxResultWindow?: number;
  /** Warning messages from the JQL validator */
  warningMessages?: string[];
}

/**
 * Facet count request. Jira Search has no REST group-by, so values are counted
 * with one count-only JQL query per bucket.
 */
export interface MetricsFacetParams extends MetricsScope {
  /** JQL field name, e.g. `'issuetype'`, `'status'`, `'priority'`, `'assignee'` */
  field: string;
  /** Bucket values to count for the field */
  values: Array<string | number>;
  /** Optional maximum number of concurrent count requests */
  concurrency?: number;
  /** Whether Jira should validate each generated JQL query */
  validateQuery?: boolean;
}

/**
 * A single facet bucket.
 */
export interface JiraIssueFacetBucket {
  /** Bucket value */
  value: string | number;
  /** JQL used for this bucket */
  jql: string;
  /** Total matching issues */
  total: number;
}

/**
 * Facet count response.
 */
export interface JiraIssueFacetCounts {
  /** Field counted */
  field: string;
  /** Buckets in the same order as requested values */
  buckets: JiraIssueFacetBucket[];
}

/**
 * User contribution dimensions supported by the lightweight REST metrics helper.
 */
export type UserContributionMetric =
  | 'created'
  | 'reported'
  | 'assigned'
  | 'updated'
  | 'worklogIssues';

/**
 * Contribution request for one or more Jira usernames/user keys.
 */
export interface UserContributionMetricsParams extends MetricsScope {
  /** Dimensions to include. Defaults to all lightweight dimensions. */
  include?: UserContributionMetric[];
  /** Optional maximum number of concurrent count requests */
  concurrency?: number;
  /** Whether Jira should validate each generated JQL query */
  validateQuery?: boolean;
}

/**
 * Counted contribution row for one user.
 */
export interface JiraUserContributionMetrics {
  /** Jira username/user key supplied by the caller */
  username: string;
  /** Issues created by the user in the scoped period */
  created?: number;
  /** Issues reported by the user in the scoped period */
  reported?: number;
  /** Issues currently assigned to the user within the scoped issue set */
  assigned?: number;
  /** Issues touched by the user according to Jira's `updatedBy()` JQL function */
  updated?: number;
  /** Issues with worklogs by the user in the scoped period */
  worklogIssues?: number;
}

/**
 * Contribution metrics response.
 */
export interface JiraUserContributionMetricsResponse {
  /** Per-user contribution rows */
  users: JiraUserContributionMetrics[];
}
