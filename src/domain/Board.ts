/**
 * Query parameters for listing boards.
 */
export interface BoardsParams {
  /** Index of the first result (0-based) */
  startAt?: number;
  /** Maximum number of results */
  maxResults?: number;
  /** Filter boards by type: `'scrum'` or `'kanban'` */
  type?: 'scrum' | 'kanban';
  /** Filter boards by name (contains match) */
  name?: string;
  /** Filter boards by project key or ID */
  projectKeyOrId?: string;
}

/**
 * The project associated with a board's filter.
 */
export interface JiraBoardProject {
  /** Numeric string project ID */
  id: string;
  /** Project key */
  key: string;
  /** Project name */
  name: string;
  /** URL of the project resource */
  self: string;
}

/**
 * The filter associated with a Jira board.
 */
export interface JiraBoardFilter {
  /** Numeric string filter ID */
  id: string;
  /** URL of the filter resource */
  self: string;
}

/**
 * A Jira Software board (Scrum or Kanban).
 */
export interface JiraBoard {
  /** Numeric board ID */
  id: number;
  /** URL of the board resource */
  self: string;
  /** Board name */
  name: string;
  /** Board type: `'scrum'` or `'kanban'` */
  type: 'scrum' | 'kanban';
  /** Filter configuration for the board */
  filter?: JiraBoardFilter;
  /** The location (project) this board belongs to */
  location?: {
    projectId?: number;
    displayName?: string;
    projectName?: string;
    projectKey?: string;
    projectTypeKey?: string;
    avatarURI?: string;
    name?: string;
  };
}

/**
 * Query parameters for listing issues on a board.
 */
export interface BoardIssuesParams {
  /** Index of the first result (0-based) */
  startAt?: number;
  /** Maximum number of results */
  maxResults?: number;
  /** JQL query to filter issues */
  jql?: string;
  /** Whether to validate the JQL query */
  validateQuery?: boolean;
  /** Comma-separated list of fields to include */
  fields?: string;
  /** Fields to expand */
  expand?: string;
}
