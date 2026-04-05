# Jira Data Center API Client

A zero-dependency TypeScript client for the **Jira Data Center REST API** (and Jira Software Agile API).

[![CI](https://github.com/ElJijuna/JiraDataCenterApiClient/actions/workflows/ci.yml/badge.svg)](https://github.com/ElJijuna/JiraDataCenterApiClient/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/jira-datacenter-api-client)](https://www.npmjs.com/package/jira-datacenter-api-client)
[![license](https://img.shields.io/npm/l/jira-datacenter-api-client)](./LICENSE)

## Features

- **Full TypeScript** — every request and response is fully typed
- **Read-only** — covers all major GET endpoints for issues, projects, boards, sprints, users, and metadata
- **Chainable resources** — `jira.issue('PROJ-42').comments()` pattern
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
```

#### Boards & Sprints (Jira Software)

```typescript
// List boards
await jira.boards({ type: 'scrum', name: 'PROJ Board' });

// Get a board (await directly or chain)
const board = await jira.board(42);

// Board sub-resources
await jira.board(42).sprints({ state: 'active' });
await jira.board(42).issues({ jql: 'status = "In Progress"' });
await jira.board(42).backlog({ maxResults: 50 });

// Sprint sub-resources
const sprint = await jira.board(42).sprint(10);
await jira.board(42).sprint(10).issues({ maxResults: 100 });
```

#### Users

```typescript
await jira.currentUser();
await jira.user('pilmee');
await jira.users({ username: 'john', maxResults: 10 });
```

#### Metadata

```typescript
await jira.issuetypes();
await jira.issuetype('1');
await jira.priorities();
await jira.priority('3');
await jira.statuses();
await jira.status('In Progress');
await jira.fields();
await jira.issueLinkTypes();
await jira.favouriteFilters();
await jira.filter('10000');
await jira.component('10001');
await jira.version('20001');
await jira.versionIssueCounts('20001');
await jira.versionUnresolvedIssueCount('20001');
```

## Pagination

Most list endpoints return a paginated response:

```typescript
interface PagedResponse<T> {
  startAt: number;
  maxResults: number;
  total: number;
  isLast?: boolean;  // Agile endpoints
  values: T[];
}
```

To iterate through pages:

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
|-------|------|-------------|
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
    console.log(err.status);     // 404
    console.log(err.statusText); // 'Not Found'
    console.log(err.message);    // 'Jira API error: 404 Not Found'
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
