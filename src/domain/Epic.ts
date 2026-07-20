/**
 * A Jira Software epic.
 *
 * `GET /rest/agile/latest/epic/{epicIdOrKey}`
 */
export interface JiraEpic {
  /** Numeric epic ID */
  id: number;
  /** Epic issue key (e.g. `'PROJ-10'`) */
  key?: string;
  /** URL of the epic resource */
  self: string;
  /** Epic name (the short label shown on cards) */
  name: string;
  /** Epic summary */
  summary?: string;
  /** Epic color */
  color?: { key: string };
  /** Whether the epic is marked as done */
  done?: boolean;
}
