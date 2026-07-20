/** Parameters for the groups picker endpoint. */
export interface GroupsPickerParams {
  /** Text to match against group names */
  query?: string;
  /** Group name to exclude from the results */
  exclude?: string;
  /** Maximum number of groups to return */
  maxResults?: number;
}

/** A group suggestion from the groups picker. */
export interface JiraGroupSuggestion {
  /** Group name */
  name: string;
  /** Group name with the match highlighted as HTML */
  html?: string;
  /** Group labels (e.g. admin) */
  labels?: Array<{ text: string; title?: string; type?: string }>;
}

/**
 * Response of the groups picker endpoint.
 *
 * `GET /rest/api/latest/groups/picker`
 */
export interface JiraGroupsPickerResponse {
  /** Summary line (e.g. `'Showing 3 of 3 matching groups'`) */
  header?: string;
  /** Total number of matching groups */
  total: number;
  /** Matching groups */
  groups: JiraGroupSuggestion[];
}

/** Parameters for the group members endpoint. */
export interface GroupMembersParams {
  /** The group to list members of */
  groupname: string;
  /** Whether to include inactive users */
  includeInactiveUsers?: boolean;
  /** Index of the first member to return */
  startAt?: number;
  /** Maximum number of members to return */
  maxResults?: number;
}
