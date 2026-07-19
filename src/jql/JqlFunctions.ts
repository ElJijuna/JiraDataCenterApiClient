import { JqlRaw } from './JqlRaw';
import { formatJqlOperand } from './JqlEscape';

/**
 * Builds a JQL function call, quoting string arguments and skipping
 * trailing `undefined` optional arguments.
 * @internal
 */
function fn(name: string, ...args: Array<string | number | undefined>): JqlRaw {
  const rendered = args
    .filter((arg): arg is string | number => arg !== undefined)
    .map((arg) => formatJqlOperand(arg));
  return new JqlRaw(`${name}(${rendered.join(', ')})`);
}

/**
 * JQL functions supported by Jira Data Center, usable anywhere an operand is
 * accepted by the builder or the `jql` tagged template. Each returns a
 * {@link JqlRaw} fragment that is inserted verbatim (never quoted).
 *
 * @example
 * ```typescript
 * import { jql, JqlFunctions } from 'jira-datacenter-api-client';
 * const { currentUser, openSprints, startOfDay } = JqlFunctions;
 *
 * jql()
 *   .field('assignee').eq(currentUser())
 *   .field('sprint').in(openSprints())
 *   .field('updated').gte(startOfDay('-7d'))
 *   .build();
 * // assignee = currentUser() AND sprint IN (openSprints()) AND updated >= startOfDay("-7d")
 * ```
 */
export const JqlFunctions = {
  /** `currentUser()` — the authenticated user. */
  currentUser: (): JqlRaw => fn('currentUser'),
  /** `currentLogin()` — the time the current session began. */
  currentLogin: (): JqlRaw => fn('currentLogin'),
  /** `lastLogin()` — the time of the previous session. */
  lastLogin: (): JqlRaw => fn('lastLogin'),
  /** `now()` — the current time. */
  now: (): JqlRaw => fn('now'),
  /** `membersOf(group)` — members of the given group. */
  membersOf: (group: string): JqlRaw => fn('membersOf', group),
  /** `startOfDay(offset?)` — e.g. `startOfDay("-1d")`. */
  startOfDay: (offset?: string): JqlRaw => fn('startOfDay', offset),
  /** `endOfDay(offset?)` */
  endOfDay: (offset?: string): JqlRaw => fn('endOfDay', offset),
  /** `startOfWeek(offset?)` */
  startOfWeek: (offset?: string): JqlRaw => fn('startOfWeek', offset),
  /** `endOfWeek(offset?)` */
  endOfWeek: (offset?: string): JqlRaw => fn('endOfWeek', offset),
  /** `startOfMonth(offset?)` */
  startOfMonth: (offset?: string): JqlRaw => fn('startOfMonth', offset),
  /** `endOfMonth(offset?)` */
  endOfMonth: (offset?: string): JqlRaw => fn('endOfMonth', offset),
  /** `startOfYear(offset?)` */
  startOfYear: (offset?: string): JqlRaw => fn('startOfYear', offset),
  /** `endOfYear(offset?)` */
  endOfYear: (offset?: string): JqlRaw => fn('endOfYear', offset),
  /** `openSprints()` — issues in open sprints (Jira Software). */
  openSprints: (): JqlRaw => fn('openSprints'),
  /** `closedSprints()` — issues in closed sprints (Jira Software). */
  closedSprints: (): JqlRaw => fn('closedSprints'),
  /** `futureSprints()` — issues in future sprints (Jira Software). */
  futureSprints: (): JqlRaw => fn('futureSprints'),
  /** `linkedIssues(issueKey, linkType?)` — issues linked to the given issue. */
  linkedIssues: (issueKey: string, linkType?: string): JqlRaw => fn('linkedIssues', issueKey, linkType),
  /** `issueHistory()` — issues recently viewed by the user. */
  issueHistory: (): JqlRaw => fn('issueHistory'),
  /** `votedIssues()` — issues the user has voted for. */
  votedIssues: (): JqlRaw => fn('votedIssues'),
  /** `watchedIssues()` — issues the user is watching. */
  watchedIssues: (): JqlRaw => fn('watchedIssues'),
  /** `earliestUnreleasedVersion(project)` */
  earliestUnreleasedVersion: (project: string): JqlRaw => fn('earliestUnreleasedVersion', project),
  /** `latestReleasedVersion(project)` */
  latestReleasedVersion: (project: string): JqlRaw => fn('latestReleasedVersion', project),
  /** `releasedVersions(project?)` */
  releasedVersions: (project?: string): JqlRaw => fn('releasedVersions', project),
  /** `unreleasedVersions(project?)` */
  unreleasedVersions: (project?: string): JqlRaw => fn('unreleasedVersions', project),
  /** `standardIssueTypes()` — all non-subtask issue types. */
  standardIssueTypes: (): JqlRaw => fn('standardIssueTypes'),
  /** `subTaskIssueTypes()` — all subtask issue types. */
  subTaskIssueTypes: (): JqlRaw => fn('subTaskIssueTypes'),
  /** `componentsLeadByUser(user?)` */
  componentsLeadByUser: (user?: string): JqlRaw => fn('componentsLeadByUser', user),
  /** `projectsLeadByUser(user?)` */
  projectsLeadByUser: (user?: string): JqlRaw => fn('projectsLeadByUser', user),
  /** `projectsWhereUserHasPermission(permission)` */
  projectsWhereUserHasPermission: (permission: string): JqlRaw => fn('projectsWhereUserHasPermission', permission),
  /** `projectsWhereUserHasRole(role)` */
  projectsWhereUserHasRole: (role: string): JqlRaw => fn('projectsWhereUserHasRole', role),
  /** `updatedBy(user, from?, to?)` — issues updated by the user in a date range. */
  updatedBy: (user: string, from?: string, to?: string): JqlRaw => fn('updatedBy', user, from, to),
} as const;
