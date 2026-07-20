# Jira Data Center API Client

A zero-dependency TypeScript client for the **Jira Data Center REST API** (and Jira Software Agile API).

[![CI](https://github.com/ElJijuna/JiraDataCenterApiClient/actions/workflows/ci.yml/badge.svg)](https://github.com/ElJijuna/JiraDataCenterApiClient/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/jira-datacenter-api-client)](https://www.npmjs.com/package/jira-datacenter-api-client)
[![license](https://img.shields.io/npm/l/jira-datacenter-api-client)](./LICENSE)

## Features

- **Full TypeScript** — every request and response is fully typed
- **Read-mostly** — covers major Jira Data Center read endpoints plus POST search/worklog helpers
- **JQL utilities** — fluent builder, injection-safe tagged template, local lint/format, and server-side validation
- **Auto-pagination** — `for await (const issue of jira.searchAll({ jql }))` walks every page for you
- **Retry & timeouts** — opt-in exponential backoff for 429/5xx, `Retry-After` support, per-request timeout, `AbortSignal`
- **Chainable resources** — `jira.issue('PROJ-42').comments()` pattern
- **Metrics helpers** — count/facet JQL buckets and lightweight user contribution activity
- **Dual package** — ships CJS + ESM, works in Node.js and browsers
- **Zero runtime dependencies** — uses native `fetch` and `URLSearchParams`
- **Request events** — hook into every HTTP request for logging and monitoring
- **Semantic versioning** — automated releases via Conventional Commits

## Installation

```bash
npm install jira-datacenter-api-client
```

## Quick Start

```typescript
import { JiraClient } from 'jira-datacenter-api-client';

const jira = new JiraClient({
  apiUrl: 'https://jira.example.com',
  user: 'my-username',
  token: 'my-personal-access-token',
});

// Search issues with JQL
const results = await jira.search({
  jql: 'project = PROJ AND status = Open ORDER BY created DESC',
  maxResults: 50,
});
console.log(results.total, 'issues found');

// Get a single issue
const issue = await jira.issue('PROJ-42');
console.log(issue.fields.summary);

// Get issue comments
const { comments } = await jira.issue('PROJ-42').comments();

// Get issue changelog
const changelog = await jira.issue('PROJ-42').changelog();

// Get a project with its components
const project = await jira.project('PROJ');
const components = await jira.project('PROJ').components();

// Get board sprints
const sprints = await jira.board(42).sprints({ state: 'active' });

// Get sprint issues
const sprintIssues = await jira.board(42).sprint(10).issues();

// Count issues without fetching pages
const bugCount = await jira.metrics.count({ jql: 'project = PROJ AND issuetype = Bug' });
```

## Authentication

The client uses **HTTP Basic Authentication** with a username and personal access token (PAT):

```typescript
const jira = new JiraClient({
  apiUrl: 'https://jira.example.com',
  user: 'my-username',
  token: 'my-personal-access-token',
  // Optional — defaults shown:
  apiPath: 'rest/api/latest',
  agileApiPath: 'rest/agile/latest',
});
```

To generate a personal access token, go to **Jira → Profile → Personal Access Tokens**.

## API Reference

### `JiraClient`

The main client. All methods return Promises.

#### Issues

```typescript
// Search with JQL (GET)
await jira.search({ jql: 'project = PROJ', maxResults: 50, fields: 'summary,status' });

// Search with POST (supports larger field lists)
await jira.searchPost({ jql: 'project = PROJ', fields: ['summary', 'status', 'assignee'] });

// Get issue (await directly or call .get())
const issue = await jira.issue('PROJ-42');
const issue = await jira.issue('PROJ-42').get({ fields: 'summary,status,assignee' });

// Issue sub-resources
await jira.issue('PROJ-42').comments({ maxResults: 20 });
await jira.issue('PROJ-42').comment('10001');
await jira.issue('PROJ-42').worklogs();
await jira.issue('PROJ-42').worklog('20001');
await jira.issue('PROJ-42').changelog({ maxResults: 50 });
await jira.issue('PROJ-42').transitions();
await jira.issue('PROJ-42').remotelinks();
await jira.issue('PROJ-42').votes();
await jira.issue('PROJ-42').watchers();
await jira.issue('PROJ-42').editmeta();   // editable fields, schemas, allowed values

// Issue suggestions (as used by link dialogs / autocomplete)
await jira.issuePicker({ query: 'timeout', currentJQL: 'project = PROJ' });
```

#### Projects

```typescript
// List all projects
await jira.projects({ expand: 'description,lead' });

// Get a single project (await directly or call .get())
const project = await jira.project('PROJ');

// Project sub-resources
await jira.project('PROJ').components();
await jira.project('PROJ').versions();
await jira.project('PROJ').statuses();     // grouped by issue type
await jira.project('PROJ').roles();        // role name → URL map
await jira.project('PROJ').role(10002);    // role with actors

// Create metadata — discover issue types and their fields (incl. custom fields)
await jira.project('PROJ').createmetaIssueTypes();
await jira.project('PROJ').createmetaFields('10001');   // fields for one issue type
```

#### Boards & Sprints (Jira Software)

```typescript
// List boards
await jira.boards({ type: 'scrum', name: 'PROJ Board' });

// Get a board (await directly or chain)
const board = await jira.board(42);

// Board sub-resources
await jira.board(42).configuration();
await jira.board(42).sprints({ state: 'active' });
await jira.board(42).issues({ jql: 'status = "In Progress"' });
await jira.board(42).backlog({ maxResults: 50 });

// Sprint sub-resources
const sprint = await jira.board(42).sprint(10);
await jira.board(42).sprint(10).issues({ maxResults: 100 });

// Board epics, projects, and versions
await jira.board(42).epics({ done: false });
await jira.board(42).epicIssues(7, { maxResults: 25 });
await jira.board(42).issuesWithoutEpic();
await jira.board(42).projects();
await jira.board(42).versions({ released: false });

// Epics (await directly or chain)
const epic = await jira.epic('PROJ-10');
await jira.epic('PROJ-10').issues({ maxResults: 100 });
await jira.epic('none').issues();   // issues that belong to no epic
```

#### Users

```typescript
await jira.currentUser();
await jira.user('pilmee');
await jira.users({ username: 'john', maxResults: 10 });

// Find issues updated by one or more users, useful when Bitbucket slugs match Jira usernames
await jira.userActivity(['pilmee', 'john'], {
  from: '-30d',
  fields: ['summary', 'updated', 'status'],
  maxResults: 50,
});

// Groups
await jira.groupsPicker({ query: 'jira-dev' });
await jira.groupMembers({ groupname: 'jira-developers', maxResults: 50 });
```

#### Metrics & Activity

```typescript
// Exact count via POST /search with maxResults: 0
await jira.metrics.count({ jql: 'project = PROJ AND statusCategory != Done' });

// Count issue buckets. Jira REST has no GROUP BY, so this runs one count query per value.
await jira.metrics.facet({
  field: 'issuetype',
  values: ['Bug', 'Story', 'Task'],
  projects: ['PROJ'],
  from: '2026-06-01',
  jql: 'statusCategory != Done',
});

// Lightweight contribution counts for Jira usernames/user keys.
// Handy when Bitbucket slugs match Jira usernames.
await jira.metrics.userContributions(['pilmee', 'john'], {
  projects: ['PROJ'],
  from: '-30d',
  include: ['created', 'updated', 'worklogIssues'],
});

// Incremental worklog feed for exact time-spent pipelines.
const changed = await jira.worklogsUpdated({ since: 1710000000000 });
const worklogs = await jira.worklogsList(changed.values.map((item) => item.worklogId));
await jira.worklogsDeleted({ since: 1710000000000 });
```

#### Metadata

```typescript
await jira.issuetypes();
await jira.issuetype('1');
await jira.priorities();
await jira.priority('3');
await jira.statuses();
await jira.status('In Progress');
await jira.resolutions();
await jira.resolution('1');
await jira.statusCategories();
await jira.statusCategory('done');
await jira.fields();
await jira.customFieldOption('10001');
await jira.issueLinkTypes();
await jira.favouriteFilters();
await jira.filter('10000');
await jira.filterColumns('10000');
await jira.filterPermissions('10000');
await jira.component('10001');
await jira.version('20001');
await jira.versionIssueCounts('20001');
await jira.versionUnresolvedIssueCount('20001');
await jira.projectCategories();
await jira.projectCategory('1');
await jira.workflows();
await jira.attachment('1000');       // metadata; download via its `content` URL
await jira.attachmentMeta();         // enabled + upload limit
await jira.dashboards({ filter: 'favourite' });
await jira.dashboard('10000');
```

#### Instance & Permissions

```typescript
// Health check / version detection
const info = await jira.serverInfo();
console.log(info.version, info.serverTime);

// What can the authenticated user do?
const { permissions } = await jira.myPermissions({ projectKey: 'PROJ' });
if (permissions.BROWSE_PROJECTS?.havePermission) { /* ... */ }

// All permissions known to the instance
await jira.permissions();
```

## JQL Utilities

Everything you need to build, validate, and run JQL queries safely.

### Fluent builder

```typescript
import { jql, field, or, not, JqlFunctions } from 'jira-datacenter-api-client';

const { currentUser, openSprints, startOfDay } = JqlFunctions;

const query = jql()
  .project('OPS')                          // project = "OPS"
  .status('Open', 'In Progress')           // status IN ("Open", "In Progress")
  .assignee(currentUser())                 // assignee = currentUser()
  .field('sprint').in(openSprints())       // sprint IN (openSprints())
  .field('updated').gte(startOfDay('-7d')) // updated >= startOfDay("-7d")
  .where(or(field('priority').eq('High'), field('labels').eq('urgent')))
  .orderBy('updated', 'DESC')
  .build();

const results = await jira.search({ jql: query, maxResults: 50 });
```

Shorthand filters: `project`, `status`, `type`, `assignee`, `reporter`, `priority`, `labels`,
`component`, `fixVersion`, `sprint`, `text`. One value renders `=`, several render `IN (…)`.

Any field, any operator — via `field(name)` (standalone, composable) or `.field(name)` /
`.orField(name)` (bound to the builder):

```typescript
field('resolution').isEmpty();                      // resolution IS EMPTY
field('Epic Link').eq('OPS-1');                     // "Epic Link" = "OPS-1"   (auto-quoted)
field('cf[10010]').eq(5);                           // cf[10010] = 5
field('status').was('Resolved', { by: 'pilmee' });  // status WAS "Resolved" BY "pilmee"
field('status').changed({ from: 'Open', to: 'Done', after: '-1w' });
not(field('status').eq('Closed'));                  // NOT (status = "Closed")
```

### Injection-safe tagged template

Interpolated strings are always escaped and quoted — user input cannot break out of the query:

```typescript
import { jql, JqlFunctions } from 'jira-datacenter-api-client';

const q = jql`project = ${projectKey} AND summary ~ ${userInput}`;
// arrays become lists, functions stay verbatim:
jql`status IN ${['Open', 'Reopened']} AND assignee = ${JqlFunctions.currentUser()}`;
```

### Lint & format (offline)

```typescript
import { lintJql, isValidJql, formatJql } from 'jira-datacenter-api-client';

lintJql('project = OPS AND');
// [{ severity: 'error', message: 'Query must not end with "AND"', start: 14, end: 17 }]

isValidJql('(a = 1');  // false

formatJql('project=OPS and status in("Open","Reopened")order by updated desc');
// project = OPS AND status IN ("Open", "Reopened") ORDER BY updated DESC

formatJql('a = 1 and b = 2 order by a', { multiline: true });
// a = 1
// AND b = 2
// ORDER BY a
```

`lintJql` is a fast heuristic (unbalanced parens, dangling `AND`/`OR`, missing operands,
malformed `ORDER BY`, unterminated strings) — it cannot know your instance's fields.
For authoritative validation ask the server:

### Server-side validation & autocomplete

```typescript
// Validate without fetching issues (uses validateQuery=true, maxResults=0)
const result = await jira.validateJql(jql().project('OPS').status('Open'));
if (!result.valid) console.error(result.errors); // server error messages

// Instance reference data: all fields (incl. custom fields), operators, functions
const meta = await jira.jqlAutocompleteData();

// Value suggestions, as in the issue navigator
const { results } = await jira.jqlAutocompleteSuggestions({ fieldName: 'status', fieldValue: 'Op' });
```

### Escaping helpers

```typescript
import { escapeJqlString, quoteJqlString, needsJqlQuoting, formatJqlField } from 'jira-datacenter-api-client';

quoteJqlString('My "special" project'); // "My \"special\" project"
needsJqlQuoting('Epic Link');           // true
formatJqlField('Epic Link');            // "Epic Link"
```

## Pagination

### Auto-pagination (recommended)

Every paginated endpoint has an `…All` companion that returns an async
iterator and manages `startAt`/`maxResults` for you:

```typescript
// Issues (POST /search under the hood — supports large JQL and field arrays)
for await (const issue of jira.searchAll({ jql: 'project = PROJ', fields: ['summary'] })) {
  console.log(issue.key, issue.fields.summary);
}

// Options: page size, item cap, and cancellation
const controller = new AbortController();
const issues = await Array.fromAsync(
  jira.searchAll({ jql: 'project = PROJ' }, { pageSize: 100, limit: 500, signal: controller.signal }),
);

// Also available:
jira.boardsAll({ type: 'scrum' });
jira.usersAll({ username: 'dev' });
jira.groupMembersAll({ groupname: 'jira-developers' });
jira.board(42).sprintsAll({ state: 'closed' });
jira.board(42).issuesAll({ jql: 'status = Open' });
jira.board(42).backlogAll();
jira.board(42).epicsAll();
jira.board(42).sprint(10).issuesAll();
jira.epic('PROJ-10').issuesAll();
```

The generic `paginate()` helper is exported too, in case you need to walk a
custom endpoint.

### Manual pagination

Paginated endpoints return one of these shapes:

```typescript
interface PagedResponse<T> {
  startAt: number;
  maxResults: number;
  total: number;
  isLast?: boolean;  // Agile endpoints
  values: T[];
}
```

To iterate through pages by hand:

```typescript
let startAt = 0;
const maxResults = 50;
let allIssues: JiraIssue[] = [];

while (true) {
  const page = await jira.search({ jql: 'project = PROJ', startAt, maxResults });
  allIssues = allIssues.concat(page.issues);
  if (page.startAt + page.issues.length >= page.total) break;
  startAt += maxResults;
}
```

## Reliability

### Retry with backoff (opt-in)

```typescript
const jira = new JiraClient({
  apiUrl: 'https://jira.example.com',
  user: 'my-username',
  token: 'my-token',
  timeoutMs: 30_000,          // abort any request after 30s
  retry: {
    retries: 3,               // attempts after the first (default: 0 — off)
    baseDelayMs: 300,         // backoff: 300ms, 600ms, 1200ms, …
    maxDelayMs: 10_000,       // cap for any single delay
    retryOn: [429, 502, 503, 504],  // default retryable statuses
  },
});

// Observe retries
jira.on('retry', (event) => {
  console.warn(`retrying ${event.url} (attempt ${event.attempt}) in ${event.delayMs}ms`);
});
```

A `Retry-After` response header takes precedence over the computed backoff
(capped by `maxDelayMs`). Network errors and timeouts are retried while
attempts remain; non-retryable statuses (e.g. 404) fail immediately.

### Cancellation

All `…All` iterators accept an `AbortSignal` that cancels both the iteration
and the in-flight request:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5_000);

for await (const issue of jira.searchAll({ jql }, { signal: controller.signal })) {
  // throws when aborted
}
```

## Request Events

Subscribe to every HTTP request for logging, metrics, or debugging:

```typescript
jira.on('request', (event) => {
  console.log(`[${event.method}] ${event.url} — ${event.durationMs}ms (${event.statusCode})`);
  if (event.error) {
    console.error('Request failed:', event.error.message);
  }
});
```

**Event payload:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `url` | `string` | Full URL requested |
| `method` | `'GET' \| 'POST'` | HTTP method |
| `startedAt` | `Date` | Request start timestamp |
| `finishedAt` | `Date` | Request end timestamp |
| `durationMs` | `number` | Duration in milliseconds |
| `statusCode` | `number?` | HTTP status code |
| `error` | `Error?` | Error object if the request failed |

## Error Handling

```typescript
import { JiraApiError } from 'jira-datacenter-api-client';

try {
  await jira.issue('PROJ-9999');
} catch (err) {
  if (err instanceof JiraApiError) {
    console.log(err.status);        // 404
    console.log(err.statusText);    // 'Not Found'
    console.log(err.message);       // 'Jira API error: 404 Not Found'
    console.log(err.errorMessages); // ['Issue Does Not Exist'] — from the response body
    console.log(err.errors);        // { field: 'message' } per-field errors, when present
  }
}
```

## TypeScript Types

All domain types are exported:

```typescript
import type {
  JiraIssue,
  JiraIssueFields,
  JiraProject,
  JiraUser,
  JiraComment,
  JiraWorklog,
  JiraChangelogEntry,
  JiraTransition,
  JiraBoard,
  JiraSprint,
  JiraSearchResponse,
  SearchParams,
  PagedResponse,
  // ... and many more
} from 'jira-datacenter-api-client';
```

## Contributing

See [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for development guidelines.

## License

[MIT](./LICENSE)
