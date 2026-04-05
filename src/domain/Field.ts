/**
 * A Jira issue field (system or custom).
 */
export interface JiraField {
  /** Unique field ID (e.g. `'summary'`, `'customfield_10000'`) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Whether this is a custom field */
  custom: boolean;
  /** Whether the field is orderable */
  orderable: boolean;
  /** Whether the field is navigable */
  navigable: boolean;
  /** Whether the field is searchable */
  searchable: boolean;
  /** Clause names used in JQL */
  clauseNames: string[];
  /** Field schema */
  schema?: {
    type: string;
    system?: string;
    custom?: string;
    customId?: number;
    items?: string;
  };
}
