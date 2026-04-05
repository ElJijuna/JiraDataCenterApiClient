/**
 * Query parameters for listing sprints on a board.
 */
export interface SprintsParams {
  /** Index of the first result (0-based) */
  startAt?: number;
  /** Maximum number of results */
  maxResults?: number;
  /** Filter by sprint state: `'future'`, `'active'`, or `'closed'` */
  state?: 'future' | 'active' | 'closed';
}

/**
 * A Jira Software sprint.
 */
export interface JiraSprint {
  /** Numeric sprint ID */
  id: number;
  /** URL of the sprint resource */
  self: string;
  /** Sprint state: `'future'`, `'active'`, or `'closed'` */
  state: 'future' | 'active' | 'closed';
  /** Sprint name */
  name: string;
  /** ISO 8601 start date */
  startDate?: string;
  /** ISO 8601 end date */
  endDate?: string;
  /** ISO 8601 date the sprint was completed */
  completeDate?: string;
  /** ID of the board this sprint belongs to */
  originBoardId?: number;
  /** Sprint goal */
  goal?: string;
}
