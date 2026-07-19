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

## P0 — Missing read (GET) endpoints

Needed for complete query coverage:

- [ ] `resolutions` / `resolution(id)` (`/rest/api/2/resolution`)
- [ ] `statusCategories` (`/rest/api/2/statuscategory`)
- [ ] `serverInfo` (`/rest/api/2/serverInfo`) — health check & DC version detection
- [ ] `mypermissions` / `permissions`
- [ ] `createmeta` / `editmeta` (issue & project) — custom field discovery
- [ ] Issue picker (`/rest/api/2/issue/picker`)
- [ ] Attachment metadata (`/rest/api/2/attachment/{id}`) + content download
- [ ] Groups: `/groups/picker`, `/group/member`
- [ ] Agile: epics (`/epic/{id}`, `board/{id}/epic`, `epic/{id}/issue`, issues without epic), `board/{id}/project`, `board/{id}/version`
- [ ] Dashboards (`/rest/api/2/dashboard`)
- [ ] Project categories, workflows, `customFieldOption/{id}`
- [ ] Filters: `/filter/{id}/columns`, `/filter/{id}/permission`

## P1 — Query ergonomics

- [ ] Auto-pagination with async iterators: `for await (const issue of jira.searchAll(jql))` (search, boards, sprints, board issues, group members)
- [ ] Typed `fields`/`expand` selection reflected in return types
- [ ] Retry with backoff for 429/503; `AbortSignal` / timeout support in requests

## P2 — Later

- [ ] Full JQL parser (AST, round-trip, lint of saved filter JQLs)
- [ ] Write operations (create/update issue, transition, add comment/worklog)
- [ ] Issue/comment properties, permission & notification schemes, avatars
