import type { JiraUser } from './User';
import type { PaginationParams } from './Pagination';

/**
 * Query parameters for listing issue changelog entries.
 */
export interface ChangelogParams extends PaginationParams {}

/**
 * A single field change within a changelog entry.
 */
export interface JiraChangelogItem {
  /** The field that was changed */
  field: string;
  /** Whether the change was to a `jira` or `custom` field */
  fieldtype: 'jira' | 'custom';
  /** Field ID */
  fieldId?: string;
  /** Previous string value */
  from?: string | null;
  /** Previous display value */
  fromString?: string | null;
  /** New string value */
  to?: string | null;
  /** New display value */
  toString?: string | null;
}

/**
 * A single changelog history entry representing a set of changes made at one point in time.
 */
export interface JiraChangelogEntry {
  /** Numeric string ID of this history entry */
  id: string;
  /** User who made the changes */
  author: JiraUser;
  /** ISO 8601 date the change was made */
  created: string;
  /** The list of individual field changes */
  items: JiraChangelogItem[];
}

/**
 * Paged response returned by `GET /rest/api/latest/issue/{key}/changelog`.
 */
export interface JiraChangelogResponse {
  /** Index of the first entry */
  startAt: number;
  /** Maximum number of entries returned */
  maxResults: number;
  /** Total number of changelog entries */
  total: number;
  /** Changelog entries in this page */
  histories: JiraChangelogEntry[];
}
