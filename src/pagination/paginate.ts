/**
 * Options accepted by every auto-paginating (`…All`) method.
 */
export interface PaginateOptions {
  /**
   * Number of items to request per page.
   * @default 50
   */
  pageSize?: number;
  /** Stop after yielding this many items (the last page may be fetched partially). */
  limit?: number;
  /** Abort signal checked between pages; aborts in-flight requests when supported. */
  signal?: AbortSignal;
}

/**
 * A single page as consumed by {@link paginate}: the items plus whatever
 * end-of-data markers the endpoint provides.
 */
export interface PaginatedPage<T> {
  /** Items in this page */
  items: T[];
  /** Total number of items across all pages, when the endpoint reports it */
  total?: number;
  /** Whether this is the last page, when the endpoint reports it (Agile) */
  isLast?: boolean;
}

/**
 * Generic page-walking async generator used by all `…All` methods.
 *
 * Handles the three pagination shapes found in the Jira Data Center API:
 * - search responses (`total` + `issues`)
 * - Agile paged responses (`isLast` and/or `total` + `values`)
 * - bare arrays (e.g. user search) — iteration stops when a page comes back
 *   shorter than the requested page size
 *
 * @param fetchPage - Fetches one page for the given `startAt` / `maxResults`
 * @param options - Page size, item limit, and abort signal
 * @yields Each item across all pages, in order
 */
export async function* paginate<T>(
  fetchPage: (startAt: number, maxResults: number) => Promise<PaginatedPage<T>>,
  options: PaginateOptions = {},
): AsyncGenerator<T, void, undefined> {
  const pageSize = options.pageSize ?? 50;
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new TypeError(`pageSize must be a positive integer, got: ${options.pageSize}`);
  }
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 0)) {
    throw new TypeError(`limit must be a non-negative integer, got: ${options.limit}`);
  }
  if (options.limit === 0) return;

  let startAt = 0;
  let yielded = 0;

  for (;;) {
    if (options.signal?.aborted) {
      throw options.signal.reason instanceof Error
        ? options.signal.reason
        : new Error('Pagination aborted');
    }

    const page = await fetchPage(startAt, pageSize);
    for (const item of page.items) {
      yield item;
      yielded += 1;
      if (options.limit !== undefined && yielded >= options.limit) return;
    }

    startAt += page.items.length;
    const exhausted =
      page.items.length === 0 ||
      page.isLast === true ||
      (page.total !== undefined && startAt >= page.total) ||
      (page.total === undefined && page.isLast === undefined && page.items.length < pageSize);
    if (exhausted) return;
  }
}
