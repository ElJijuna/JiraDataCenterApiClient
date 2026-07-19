# Roadmap

Goal: full read/query coverage of the Jira Data Center 10.x REST API (core `rest/api/2` + Agile `rest/agile/1.0`), with first-class tooling for building JQL.

## P0 — JQL utilities ✅ (v1.2)

The complete "build → validate → query" flow:

- [x] Fluent `JqlBuilder` (`jql()`) with shorthand filters, `field()` conditions, `AND`/`OR`/`NOT` grouping, and `ORDER BY`
- [x] Composable clause API: `field()`, `and()`, `or()`, `not()`, `raw()`
- [x] Correct escaping/quoting everywhere (reserved words, special characters, `cf[10010]`, `"Epic Link"`)
- [x] Injection-safe tagged template: `` jql`summary ~ ${userInput}` ``
- [x] JQL functions catalog (`JqlFunctions`): `currentUser()`, `membersOf()`, `openSprints()`, `startOfDay()`, `updatedBy()`, …
- [x] History clauses: `WAS` / `WAS IN` / `CHANGED` with `FROM/TO/BY/BEFORE/AFTER/ON/DURING` predicates
- [x] Offline lint: `lintJql()` / `isValidJql()` (tokenizer-based heuristics with positions)
- [x] Formatter: `formatJql()` (normalized spacing, uppercase keywords, optional multiline)
- [x] Server-side validation: `jira.validateJql()` (via `validateQuery=true`, returns server error messages)
- [x] Instance reference data: `jira.jqlAutocompleteData()` + `jira.jqlAutocompleteSuggestions()`
- [x] `JiraApiError` now carries `errorMessages` / `errors` from the response body

## P0 — Missing read (GET) endpoints ✅ (v1.2)

Needed for complete query coverage:

- [x] `resolutions()` / `resolution(id)` (`/rest/api/2/resolution`)
- [x] `statusCategories()` / `statusCategory(idOrKey)` (`/rest/api/2/statuscategory`)
- [x] `serverInfo()` (`/rest/api/2/serverInfo`) — health check & DC version detection
- [x] `myPermissions(context?)` / `permissions()`
- [x] Create/edit metadata: `project(k).createmetaIssueTypes()`, `project(k).createmetaFields(typeId)`, `issue(k).editmeta()` — custom field discovery
- [x] Issue picker: `issuePicker(params)` (`/rest/api/2/issue/picker`)
- [x] Attachment metadata: `attachment(id)`, `attachmentMeta()` (content downloadable via the returned `content` URL)
- [x] Groups: `groupsPicker(params)`, `groupMembers(params)`
- [x] Agile epics: `epic(idOrKey)` resource (`.get()`, `.issues()`, `epic('none').issues()`), `board(id).epics()`, `board(id).epicIssues(epicId)`, `board(id).issuesWithoutEpic()`, `board(id).projects()`, `board(id).versions()`
- [x] Dashboards: `dashboards(params?)`, `dashboard(id)`
- [x] `projectCategories()` / `projectCategory(id)`, `workflows()`, `customFieldOption(id)`
- [x] Filters: `filterColumns(id)`, `filterPermissions(id)`

## P1 — Query ergonomics

- [ ] Auto-pagination with async iterators: `for await (const issue of jira.searchAll(jql))` (search, boards, sprints, board issues, group members)
- [ ] Typed `fields`/`expand` selection reflected in return types
- [ ] Retry with backoff for 429/503; `AbortSignal` / timeout support in requests

## P2 — Later

- [ ] Full JQL parser (AST, round-trip, lint of saved filter JQLs)
- [ ] Write operations (create/update issue, transition, add comment/worklog)
- [ ] Issue/comment properties, permission & notification schemes, avatars
