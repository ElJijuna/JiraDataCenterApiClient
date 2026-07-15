import type { SearchPostParams, JiraSearchResponse } from '../domain/IssueSearch';
import type {
  JiraIssueCount,
  JiraIssueFacetBucket,
  JiraIssueFacetCounts,
  JiraUserContributionMetrics,
  JiraUserContributionMetricsResponse,
  MetricsCountParams,
  MetricsFacetParams,
  MetricsScope,
  UserContributionMetric,
  UserContributionMetricsParams,
} from '../domain/Metrics';

type SearchPostFn = (body: SearchPostParams) => Promise<JiraSearchResponse>;

const DEFAULT_CONTRIBUTION_METRICS: UserContributionMetric[] = [
  'created',
  'reported',
  'assigned',
  'updated',
  'worklogIssues',
];

/**
 * Lightweight Jira metrics derived from public Jira Data Center REST/JQL.
 */
export class MetricsResource {
  /** @internal */
  constructor(private readonly searchPost: SearchPostFn) {}

  /**
   * Counts issues matching a JQL query.
   *
   * Jira Data Center does not expose a dedicated count endpoint; this uses
   * `POST /rest/api/latest/search` with `maxResults: 0`.
   */
  async count(params: MetricsCountParams = {}): Promise<JiraIssueCount> {
    const jql = params.jql?.trim() || '';
    const response = await this.searchPost({
      jql,
      maxResults: 0,
      fields: ['id'],
      validateQuery: params.validateQuery,
    });

    return {
      jql,
      total: response.total,
      maxResultWindow: response.maxResultWindow,
      warningMessages: response.warningMessages,
    };
  }

  /**
   * Counts a list of values for one JQL field.
   */
  async facet(params: MetricsFacetParams): Promise<JiraIssueFacetCounts> {
    const { field, values, concurrency = 4, validateQuery } = params;
    const scopeJql = buildScopeJql(params);
    const tasks = values.map((value) => async (): Promise<JiraIssueFacetBucket> => {
      const bucketJql = joinJql([scopeJql, `${field} = ${quoteJqlValue(value)}`]);
      const count = await this.count({ jql: bucketJql, validateQuery });
      return {
        value,
        jql: count.jql,
        total: count.total,
      };
    });

    return {
      field,
      buckets: await runLimited(tasks, concurrency),
    };
  }

  /**
   * Counts lightweight contribution dimensions for one or more users.
   *
   * `updated` uses Jira's `updatedBy()` JQL function. `worklogIssues` counts
   * issues with worklogs by the user, not individual worklog rows.
   */
  async userContributions(
    usernames: string | string[],
    params: UserContributionMetricsParams = {},
  ): Promise<JiraUserContributionMetricsResponse> {
    const names = normalizeUsernames(usernames);
    const include = params.include ?? DEFAULT_CONTRIBUTION_METRICS;
    const tasks = names.map((username) => async (): Promise<JiraUserContributionMetrics> => {
      const row: JiraUserContributionMetrics = { username };
      const metricTasks = include.map((metric) => async () => {
        const jql = contributionJql(username, metric, params);
        const metricCount = await this.count({ jql, validateQuery: params.validateQuery });
        row[metric] = metricCount.total;
      });

      await runLimited(metricTasks, params.concurrency ?? 4);
      return row;
    });

    return {
      users: await runLimited(tasks, params.concurrency ?? 4),
    };
  }
}

function normalizeUsernames(usernames: string | string[]): string[] {
  const names = (Array.isArray(usernames) ? usernames : [usernames])
    .map((username) => username.trim())
    .filter((username) => username.length > 0);

  if (names.length === 0) {
    throw new TypeError('At least one username is required to calculate contribution metrics');
  }

  return names;
}

function contributionJql(
  username: string,
  metric: UserContributionMetric,
  scope: MetricsScope,
): string {
  const quotedUser = quoteJqlString(username);
  const scopeJql = buildScopeJql(scope);

  if (metric === 'created') {
    return joinJql([scopeJql, `creator = ${quotedUser}`, dateRangeJql('created', scope)]);
  }

  if (metric === 'reported') {
    return joinJql([scopeJql, `reporter = ${quotedUser}`, dateRangeJql('created', scope)]);
  }

  if (metric === 'assigned') {
    return joinJql([scopeJql, `assignee = ${quotedUser}`]);
  }

  if (metric === 'updated') {
    return joinJql([scopeJql, updatedByJql(username, scope.from, scope.to)]);
  }

  return joinJql([scopeJql, `worklogAuthor = ${quotedUser}`, dateRangeJql('worklogDate', scope)]);
}

function buildScopeJql(scope: MetricsScope): string {
  return joinJql([
    scope.projects && scope.projects.length > 0
      ? `project IN (${scope.projects.map(quoteJqlValue).join(', ')})`
      : undefined,
    scope.jql,
  ]);
}

function updatedByJql(username: string, from?: string, to?: string): string {
  return `issuekey IN updatedBy(${[
    quoteJqlString(username),
    from ? quoteJqlString(from) : undefined,
    to ? quoteJqlString(to) : undefined,
  ].filter(Boolean).join(', ')})`;
}

function dateRangeJql(field: string, scope: MetricsScope): string {
  return joinJql([
    scope.from ? `${field} >= ${quoteJqlString(scope.from)}` : undefined,
    scope.to ? `${field} <= ${quoteJqlString(scope.to)}` : undefined,
  ]);
}

function joinJql(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .map((part) => `(${part})`)
    .join(' AND ');
}

function quoteJqlValue(value: string | number): string {
  return typeof value === 'number' ? String(value) : quoteJqlString(value);
}

function quoteJqlString(value: string): string {
  return `"${value.replace(/(["\\])/g, '\\$1')}"`;
}

async function runLimited<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results: T[] = new Array(tasks.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}
