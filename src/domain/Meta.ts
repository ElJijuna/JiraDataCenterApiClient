import type { JiraIssueType } from './IssueType';
import type { PagedResponse } from './Pagination';

/**
 * Schema of a field in create/edit metadata.
 */
export interface JiraFieldMetaSchema {
  /** Field data type (e.g. `'string'`, `'array'`, `'user'`) */
  type: string;
  /** Item type for array fields */
  items?: string;
  /** System field name, for system fields */
  system?: string;
  /** Custom field type key, for custom fields */
  custom?: string;
  /** Custom field ID, for custom fields */
  customId?: number;
}

/**
 * Metadata describing how a single field can be set when creating or
 * editing an issue: whether it is required, its schema, allowed values,
 * and supported operations.
 */
export interface JiraFieldMeta {
  /** Whether the field must be provided */
  required: boolean;
  /** Field schema (type information) */
  schema?: JiraFieldMetaSchema;
  /** Human-readable field name */
  name: string;
  /** Field ID (e.g. `'summary'`, `'customfield_10010'`) */
  fieldId?: string;
  /** URL to fetch autocomplete suggestions for the field */
  autoCompleteUrl?: string;
  /** Whether the field has a default value */
  hasDefaultValue?: boolean;
  /** The default value, when present */
  defaultValue?: unknown;
  /** Operations that can be performed on the field (e.g. `'set'`, `'add'`) */
  operations?: string[];
  /** Values allowed for the field, when constrained */
  allowedValues?: unknown[];
}

/**
 * Edit metadata for an issue: every editable field keyed by field ID.
 *
 * `GET /rest/api/latest/issue/{issueIdOrKey}/editmeta`
 */
export interface JiraEditMeta {
  fields: Record<string, JiraFieldMeta>;
}

/** Pagination options for the create-metadata endpoints. */
export interface CreateMetaParams {
  /** Index of the first item to return */
  startAt?: number;
  /** Maximum number of items to return */
  maxResults?: number;
}

/**
 * Paged issue types available for creating issues in a project.
 *
 * `GET /rest/api/latest/issue/createmeta/{projectIdOrKey}/issuetypes`
 */
export type JiraCreateMetaIssueTypes = PagedResponse<JiraIssueType>;

/**
 * Paged field metadata for creating issues of a given type in a project.
 *
 * `GET /rest/api/latest/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId}`
 */
export type JiraCreateMetaFields = PagedResponse<JiraFieldMeta>;
