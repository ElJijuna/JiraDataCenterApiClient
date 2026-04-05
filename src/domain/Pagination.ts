/**
 * Common query parameters for paginated endpoints.
 */
export interface PaginationParams {
  /** Index of the first item to return (0-based). Default: 0 */
  startAt?: number;
  /** Maximum number of items to return. Default varies by endpoint */
  maxResults?: number;
}

/**
 * Generic paged response returned by list endpoints.
 *
 * @template T - The type of items in the page
 */
export interface PagedResponse<T> {
  /** Index of the first item in this page */
  startAt: number;
  /** Maximum number of items requested */
  maxResults: number;
  /** Total number of items matching the query */
  total: number;
  /** Whether this is the last page (used by Agile endpoints) */
  isLast?: boolean;
  /** The items in this page */
  values: T[];
}
