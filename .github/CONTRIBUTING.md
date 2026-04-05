# Contributing

Thank you for considering a contribution to **jira-datacenter-api-client**!

## Development setup

```bash
git clone https://github.com/ElJijuna/JiraDataCenterApiClient.git
cd JiraDataCenterApiClient
npm install
```

## Running tests

```bash
npm test              # run tests once
npm run test:coverage # run with coverage report
```

All new code must be covered by tests. Tests live in `tests/` and follow the same file structure as `src/`.

## Building

```bash
npm run build   # compiles CJS + ESM to dist/
npm run docs    # generates TypeDoc documentation to docs/
```

## Adding a new endpoint

1. **Add a domain type** in `src/domain/` if a new response shape is needed.
2. **Add the method** to the appropriate resource class in `src/resources/`, or directly to `JiraClient.ts`.
3. **Export any new types** from `src/index.ts`.
4. **Write tests** in `tests/JiraClient.test.ts` — mock `fetch` and assert the correct URL is called.
5. **Update the README** `API Reference` section.

## Commit conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Version bump |
|--------|-------------|
| `feat:` | minor |
| `fix:` | patch |
| `feat!:` / `BREAKING CHANGE:` | major |
| `docs:`, `chore:`, `refactor:`, `test:` | no release |

Examples:
```
feat: add issue worklog endpoint
fix: url-encode status name in status() method
docs: add searchPost example to README
```

## Code style

- TypeScript strict mode — no `any`, prefer `unknown`
- No runtime dependencies
- All public API surface must have JSDoc comments
- Resource methods follow the pattern: `GET /rest/api/latest/...` documented in the comment
