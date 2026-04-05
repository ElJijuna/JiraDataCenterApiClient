import type { JiraUser } from './User';
import type { JiraStatus } from './Status';
import type { JiraPriority } from './Priority';
import type { JiraIssueType } from './IssueType';
import type { JiraComponent } from './Component';
import type { JiraVersion } from './Version';
import type { JiraAttachment } from './Attachment';
import type { JiraIssueLink, JiraIssueRef } from './IssueLink';
import type { JiraCommentResponse } from './Comment';
import type { JiraWorklogResponse } from './Worklog';
import type { JiraProjectRef } from './Project';
import type { JiraVotes } from './Vote';
import type { JiraWatchers } from './Watcher';

/**
 * Query parameters for fetching an issue.
 */
export interface IssueParams {
  /** Comma-separated list of fields to include (e.g. `'summary,status,assignee'`).
   *  Use `'*all'` for all fields. Default: all navigable fields. */
  fields?: string;
  /** Fields to expand (e.g. `'changelog,renderedFields,transitions'`) */
  expand?: string;
  /** Properties to include */
  properties?: string;
  /** Whether to update the view count */
  updateHistory?: boolean;
}

/**
 * Time tracking information on a Jira issue.
 */
export interface JiraTimeTracking {
  /** Original estimate in Jira notation (e.g. `'2h 30m'`) */
  originalEstimate?: string;
  /** Remaining estimate in Jira notation */
  remainingEstimate?: string;
  /** Time spent in Jira notation */
  timeSpent?: string;
  /** Original estimate in seconds */
  originalEstimateSeconds?: number;
  /** Remaining estimate in seconds */
  remainingEstimateSeconds?: number;
  /** Time spent in seconds */
  timeSpentSeconds?: number;
}

/**
 * A minimal subtask reference used inside issue fields.
 */
export interface JiraSubtask {
  /** URL of the issue resource */
  self: string;
  /** Issue key */
  key: string;
  /** Issue ID */
  id: string;
  /** Basic subtask fields */
  fields: {
    summary: string;
    status: JiraStatus;
    priority?: JiraPriority;
    issuetype: JiraIssueType;
  };
}

/**
 * A resolution object on a Jira issue.
 */
export interface JiraResolution {
  /** URL of the resolution resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** Resolution name (e.g. `'Fixed'`, `'Won\'t Fix'`) */
  name: string;
  /** Resolution description */
  description?: string;
}

/**
 * The core issue fields returned by the Jira REST API.
 *
 * Common system fields are typed explicitly; custom fields
 * and any other keys are accessible via the index signature.
 */
export interface JiraIssueFields {
  /** Issue summary */
  summary: string;
  /** Issue description */
  description?: string | null;
  /** Current workflow status */
  status: JiraStatus;
  /** Issue type */
  issuetype: JiraIssueType;
  /** Issue priority */
  priority?: JiraPriority | null;
  /** Assigned user */
  assignee?: JiraUser | null;
  /** Reporter user */
  reporter?: JiraUser | null;
  /** Creator user */
  creator?: JiraUser | null;
  /** The project this issue belongs to */
  project: JiraProjectRef;
  /** ISO 8601 creation timestamp */
  created: string;
  /** ISO 8601 last update timestamp */
  updated: string;
  /** ISO 8601 resolution timestamp */
  resolutiondate?: string | null;
  /** Resolution */
  resolution?: JiraResolution | null;
  /** Labels */
  labels?: string[];
  /** Components */
  components?: JiraComponent[];
  /** Fix versions */
  fixVersions?: JiraVersion[];
  /** Affected versions */
  versions?: JiraVersion[];
  /** Sub-tasks */
  subtasks?: JiraSubtask[];
  /** Parent issue (for sub-tasks or issues in epics) */
  parent?: JiraIssueRef | null;
  /** Issue links */
  issuelinks?: JiraIssueLink[];
  /** File attachments */
  attachment?: JiraAttachment[];
  /** Embedded comment page */
  comment?: JiraCommentResponse;
  /** Embedded worklog page */
  worklog?: JiraWorklogResponse;
  /** Time tracking */
  timetracking?: JiraTimeTracking;
  /** Votes */
  votes?: JiraVotes;
  /** Watches */
  watches?: JiraWatchers;
  /** Due date in `YYYY-MM-DD` format */
  duedate?: string | null;
  /** Environment description */
  environment?: string | null;
  /** Any additional fields (custom fields, etc.) */
  [key: string]: unknown;
}

/**
 * A Jira issue.
 */
export interface JiraIssue {
  /** Numeric string ID */
  id: string;
  /** Issue key (e.g. `'PROJ-42'`) */
  key: string;
  /** URL of the issue resource */
  self: string;
  /** Issue fields */
  fields: JiraIssueFields;
}
