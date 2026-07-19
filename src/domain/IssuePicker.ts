/** Parameters for the issue picker endpoint. */
export interface IssuePickerParams {
  /** Text typed by the user, matched against summary and key */
  query?: string;
  /** JQL restricting the search space (e.g. the current filter) */
  currentJQL?: string;
  /** Key of the issue the picker is shown on, excluded from results */
  currentIssueKey?: string;
  /** ID of the project to prioritize matches from */
  currentProjectId?: string;
  /** Whether to include subtasks */
  showSubTasks?: boolean;
  /** Whether to include the parent of the current issue when it is a subtask */
  showSubTaskParent?: boolean;
}

/** A single issue suggestion from the issue picker. */
export interface JiraIssuePickerIssue {
  /** Issue key (e.g. `'PROJ-42'`) */
  key: string;
  /** Issue key with the match highlighted as HTML */
  keyHtml?: string;
  /** URL of the issue type icon */
  img?: string;
  /** Summary with the match highlighted as HTML */
  summary?: string;
  /** Plain-text summary */
  summaryText?: string;
}

/** A group of issue picker suggestions (e.g. History Search, Current Search). */
export interface JiraIssuePickerSection {
  /** Section label shown in the UI */
  label: string;
  /** Sub-label with match details */
  sub?: string;
  /** Section identifier (e.g. `'hs'`, `'cs'`) */
  id: string;
  /** Message shown when the section has no matches */
  msg?: string;
  /** Matching issues */
  issues: JiraIssuePickerIssue[];
}

/**
 * Response of the issue picker endpoint.
 *
 * `GET /rest/api/latest/issue/picker`
 */
export interface JiraIssuePickerResponse {
  sections: JiraIssuePickerSection[];
}
