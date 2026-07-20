/** A Jira dashboard. */
export interface JiraDashboard {
  /** Numeric string ID */
  id: string;
  /** Dashboard name */
  name: string;
  /** URL of the dashboard resource */
  self: string;
  /** URL to view the dashboard in the UI */
  view?: string;
}

/**
 * Paged response of the dashboards endpoint.
 *
 * `GET /rest/api/latest/dashboard`
 */
export interface JiraDashboardsResponse {
  startAt: number;
  maxResults: number;
  total: number;
  /** URL of the previous page, when available */
  prev?: string;
  /** URL of the next page, when available */
  next?: string;
  dashboards: JiraDashboard[];
}

/** Parameters for the dashboards endpoint. */
export interface DashboardsParams {
  /** `'favourite'` or `'my'` to restrict the list */
  filter?: 'favourite' | 'my';
  /** Index of the first dashboard to return */
  startAt?: number;
  /** Maximum number of dashboards to return */
  maxResults?: number;
}
