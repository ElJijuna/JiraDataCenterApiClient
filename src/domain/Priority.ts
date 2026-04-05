/**
 * A Jira issue priority.
 */
export interface JiraPriority {
  /** URL of the priority resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** Priority name (e.g. `'Highest'`, `'High'`, `'Medium'`, `'Low'`, `'Lowest'`) */
  name: string;
  /** Priority description */
  description?: string;
  /** URL of the priority icon */
  iconUrl?: string;
  /** Hex status color */
  statusColor?: string;
}
