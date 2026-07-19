/**
 * A Jira workflow, as returned by the workflows endpoint.
 *
 * `GET /rest/api/latest/workflow`
 */
export interface JiraWorkflow {
  /** Workflow name */
  name: string;
  /** Workflow description */
  description?: string;
  /** Number of steps in the workflow */
  steps?: number;
  /** Whether this is the default workflow */
  default?: boolean;
  /** Last modification date, as a display string */
  lastModifiedDate?: string;
  /** Username of the last modifier */
  lastModifiedUser?: string;
}
