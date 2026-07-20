/**
 * General information about the Jira Data Center instance.
 *
 * `GET /rest/api/latest/serverInfo`
 */
export interface JiraServerInfo {
  /** Base URL of the instance */
  baseUrl: string;
  /** Version string (e.g. `'10.3.0'`) */
  version: string;
  /** Version as numeric components (e.g. `[10, 3, 0]`) */
  versionNumbers: number[];
  /** Deployment type (`'Server'` for Data Center) */
  deploymentType?: string;
  /** Build number */
  buildNumber: number;
  /** ISO 8601 build date */
  buildDate?: string;
  /** ISO 8601 current server time (useful as a health check) */
  serverTime?: string;
  /** SCM revision the build was made from */
  scmInfo?: string;
  /** Instance title shown in the UI */
  serverTitle?: string;
}
