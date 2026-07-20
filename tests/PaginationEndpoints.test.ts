import type { JiraIssue } from '../src/domain/Issue';
import type { JiraUser } from '../src/domain/User';
import { JiraClient } from '../src/JiraClient';

const API_URL = 'https://jira.example.com';
const BASE_API = `${API_URL}/rest/api/latest`;
const BASE_AGILE = `${API_URL}/rest/agile/latest`;
const issue = (key: string): JiraIssue =>
  ({ id: key, key, self: `${BASE_API}/issue/${key}`, fields: {} }) as unknown as JiraIssue;
const user = (name: string): JiraUser =>
  ({ name, key: name, displayName: name }) as unknown as JiraUser;
const collect = async <T>(gen: AsyncGenerator<T>): Promise<T[]> => {
  const items: T[] = [];

  for await (const item of gen) {
    items.push(item);
  }

  return items;
};

describe('auto-pagination endpoints', () => {
  let jira: JiraClient;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    jira = new JiraClient({ apiUrl: API_URL, user: 'pilmee', token: 'my-token' });
  });

  const mockJson = <T>(data: T): void => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(data),
    } as Response);
  };
  const searchPage = (keys: string[], startAt: number, total: number) => ({
    startAt,
    maxResults: keys.length,
    total,
    issues: keys.map(issue),
  });
  const valuesPage = <T>(values: T[], startAt: number, total: number, isLast?: boolean) => ({
    startAt,
    maxResults: values.length,
    total,
    isLast,
    values,
  });

  describe('searchAll', () => {
    it('walks pages via POST /search, managing startAt', async () => {
      mockJson(searchPage(['OPS-1', 'OPS-2'], 0, 3));
      mockJson(searchPage(['OPS-3'], 2, 3));

      const issues = await collect(
        jira.searchAll({ jql: 'project = OPS', fields: ['summary'] }, { pageSize: 2 }),
      );

      expect(issues.map((i) => i.key)).toEqual(['OPS-1', 'OPS-2', 'OPS-3']);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const firstBody = JSON.parse(
        (fetchMock.mock.calls[0][1] as RequestInit).body as string,
      ) as Record<string, unknown>;
      const secondBody = JSON.parse(
        (fetchMock.mock.calls[1][1] as RequestInit).body as string,
      ) as Record<string, unknown>;

      expect(firstBody).toEqual({
        jql: 'project = OPS',
        fields: ['summary'],
        startAt: 0,
        maxResults: 2,
      });
      expect(secondBody.startAt).toBe(2);
      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_API}/search`);
    });

    it('honors the item limit', async () => {
      mockJson(searchPage(['OPS-1', 'OPS-2'], 0, 100));
      const issues = await collect(
        jira.searchAll({ jql: 'project = OPS' }, { pageSize: 2, limit: 1 }),
      );

      expect(issues.map((i) => i.key)).toEqual(['OPS-1']);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects when aborted mid-request', async () => {
      const controller = new AbortController();

      fetchMock.mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason as Error));
          }),
      );
      const pending = jira
        .searchAll({ jql: 'project = OPS' }, { signal: controller.signal })
        .next();

      controller.abort(new Error('stop it'));
      await expect(pending).rejects.toThrow('stop it');
    });
  });

  describe('boardsAll / usersAll / groupMembersAll', () => {
    it('walks Agile paged responses using isLast', async () => {
      mockJson(valuesPage([{ id: 1, name: 'A', type: 'scrum' }], 0, 2, false));
      mockJson(valuesPage([{ id: 2, name: 'B', type: 'scrum' }], 1, 2, true));
      const boards = await collect(jira.boardsAll({ type: 'scrum' }, { pageSize: 1 }));

      expect(boards.map((b) => b.id)).toEqual([1, 2]);
      const url = new URL(fetchMock.mock.calls[0][0] as string);

      expect(url.href).toContain(`${BASE_AGILE}/board?`);
      expect(url.searchParams.get('type')).toBe('scrum');
      expect(url.searchParams.get('startAt')).toBe('0');
      expect(url.searchParams.get('maxResults')).toBe('1');
    });

    it('walks bare-array user pages until a short page', async () => {
      mockJson([user('a'), user('b')]);
      mockJson([user('c')]);
      const users = await collect(jira.usersAll({ username: 'dev' }, { pageSize: 2 }));

      expect(users.map((u) => u.name)).toEqual(['a', 'b', 'c']);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('walks group members pages', async () => {
      mockJson(valuesPage([user('a')], 0, 2, false));
      mockJson(valuesPage([user('b')], 1, 2, true));
      const members = await collect(
        jira.groupMembersAll({ groupname: 'jira-developers' }, { pageSize: 1 }),
      );

      expect(members.map((u) => u.name)).toEqual(['a', 'b']);
      const url = new URL(fetchMock.mock.calls[0][0] as string);

      expect(url.searchParams.get('groupname')).toBe('jira-developers');
    });
  });

  describe('resource …All methods', () => {
    it('board.sprintsAll walks sprint pages', async () => {
      mockJson(valuesPage([{ id: 10, name: 'Sprint 1', state: 'closed' }], 0, 1, true));
      const sprints = await collect(jira.board(42).sprintsAll({ state: 'closed' }));

      expect(sprints.map((s) => s.id)).toEqual([10]);
      expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toContain('/board/42/sprint');
    });

    it('board.issuesAll and board.backlogAll walk search-shaped pages', async () => {
      mockJson(searchPage(['OPS-1'], 0, 1));
      expect((await collect(jira.board(42).issuesAll({ jql: 'status = Open' })))[0].key).toBe(
        'OPS-1',
      );
      expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toContain('/board/42/issue');

      mockJson(searchPage(['OPS-2'], 0, 1));
      expect((await collect(jira.board(42).backlogAll()))[0].key).toBe('OPS-2');
      expect(new URL(fetchMock.mock.calls[1][0] as string).pathname).toContain('/board/42/backlog');
    });

    it('board.epicsAll walks epic pages', async () => {
      mockJson(valuesPage([{ id: 7, self: 'x', name: 'Epic' }], 0, 1, true));
      const epics = await collect(jira.board(42).epicsAll({ done: false }));

      expect(epics.map((e) => e.id)).toEqual([7]);
      expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.get('done')).toBe('false');
    });

    it('sprint.issuesAll and epic.issuesAll walk their issue pages', async () => {
      mockJson(searchPage(['OPS-3'], 0, 1));
      expect((await collect(jira.board(42).sprint(10).issuesAll()))[0].key).toBe('OPS-3');
      expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toContain('/sprint/10/issue');

      mockJson(searchPage(['OPS-4'], 0, 1));
      expect((await collect(jira.epic('none').issuesAll({ fields: 'summary' })))[0].key).toBe(
        'OPS-4',
      );
      expect(new URL(fetchMock.mock.calls[1][0] as string).pathname).toContain('/epic/none/issue');
    });

    it('all …All methods work without arguments', async () => {
      mockJson(valuesPage([{ id: 1, name: 'S', state: 'active' }], 0, 1, true));
      expect(await collect(jira.board(42).sprintsAll())).toHaveLength(1);

      mockJson(searchPage(['OPS-1'], 0, 1));
      expect(await collect(jira.board(42).issuesAll())).toHaveLength(1);

      mockJson(searchPage(['OPS-2'], 0, 1));
      expect(await collect(jira.board(42).backlogAll({ jql: 'ORDER BY rank' }))).toHaveLength(1);

      mockJson(valuesPage([{ id: 7, self: 'x', name: 'E' }], 0, 1, true));
      expect(await collect(jira.board(42).epicsAll())).toHaveLength(1);

      mockJson(searchPage(['OPS-3'], 0, 1));
      expect(await collect(jira.epic(7).issuesAll())).toHaveLength(1);

      mockJson(searchPage(['OPS-4'], 0, 1));
      expect(await collect(jira.searchAll())).toHaveLength(1);

      mockJson([user('a')]);
      expect(await collect(jira.usersAll())).toHaveLength(1);

      mockJson(valuesPage([{ id: 1, name: 'B', type: 'scrum' }], 0, 1, true));
      expect(await collect(jira.boardsAll())).toHaveLength(1);
    });
  });
});
