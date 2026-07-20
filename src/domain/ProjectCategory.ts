/**
 * A project category.
 *
 * `GET /rest/api/latest/projectCategory`
 */
export interface JiraProjectCategory {
  /** URL of the project category resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** Category name */
  name: string;
  /** Category description */
  description?: string;
}
