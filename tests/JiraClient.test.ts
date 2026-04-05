import { JiraClient } from '../src/JiraClient';
import { JiraApiError } from '../src/errors/JiraApiError';
import type { JiraIssue, JiraIssueFields } from '../src/domain/Issue';
import type { JiraProject } from '../src/domain/Project';
import type { JiraUser } from '../src/domain/User';
import type { JiraComment, JiraCommentResponse } from '../src/domain/Comment';
import type { JiraWorklog, JiraWorklogResponse } from '../src/domain/Worklog';
import type { JiraChangelogResponse } from '../src/domain/Changelog';
import type { JiraTransition } from '../src/domain/Transition';
import type { JiraRemoteLink } from '../src/domain/RemoteLink';
import type { JiraVotes } from '../src/domain/Vote';
import type { JiraWatchers } from '../src/domain/Watcher';
import type { JiraIssueType } from '../src/domain/IssueType';
import type { JiraPriority } from '../src/domain/Priority';
import type { JiraStatus } from '../src/domain/Status';
import type { JiraField } from '../src/domain/Field';
import type { JiraFilter } from '../src/domain/Filter';
import type { JiraBoard } from '../src/domain/Board';
import type { JiraSprint } from '../src/domain/Sprint';
import type { JiraSearchResponse } from '../src/domain/IssueSearch';
import type { JiraComponent } from '../src/domain/Component';
import type { JiraVersion } from '../src/domain/Version';
import type { JiraIssueLinkType } from '../src/domain/IssueLink';

const API_URL = 'https://jira.example.com';
const BASE_API = `${API_URL}/rest/api/latest`;
const BASE_AGILE = `${API_URL}/rest/agile/latest`;
const USER = 'pilmee';
const TOKEN = 'my-token';

// ─── Mock fixtures ───────────────────────────────────────────────────────────

const mockStatus: JiraStatus = {
  self: `${BASE_API}/status/1`,
  id: '1',
  name: 'Open',
  statusCategory: { self: `${BASE_API}/statuscategory/2`, id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
};

const mockIssueType: JiraIssueType = {
  self: `${BASE_API}/issuetype/1`,
  id: '1',
  name: 'Story',
  subtask: false,
};

const mockPriority: JiraPriority = {
  self: `${BASE_API}/priority/3`,
  id: '3',
  name: 'Medium',
};

const mockUser: JiraUser = {
  self: `${BASE_API}/user?username=pilmee`,
  key: 'pilmee',
  name: 'pilmee',
  emailAddress: 'pilmee@example.com',
  displayName: 'John Doe',
  active: true,
  timeZone: 'America/New_York',
};

const mockProjectRef = {
  self: `${BASE_API}/project/PROJ`,
  id: '10000',
  key: 'PROJ',
  name: 'My Project',
};

const mockIssueFields: JiraIssueFields = {
  summary: 'Test issue summary',
  status: mockStatus,
  issuetype: mockIssueType,
  priority: mockPriority,
  assignee: mockUser,
  reporter: mockUser,
  creator: mockUser,
  project: mockProjectRef,
  created: '2024-01-01T10:00:00.000+0000',
  updated: '2024-01-02T10:00:00.000+0000',
  labels: ['backend', 'api'],
};

const mockIssue: JiraIssue = {
  id: '10042',
  key: 'PROJ-42',
  self: `${BASE_API}/issue/PROJ-42`,
  fields: mockIssueFields,
};

const mockProject: JiraProject = {
  self: `${BASE_API}/project/PROJ`,
  id: '10000',
  key: 'PROJ',
  name: 'My Project',
  description: 'A test project',
  projectTypeKey: 'software',
  lead: mockUser,
};

const mockComment: JiraComment = {
  self: `${BASE_API}/issue/PROJ-42/comment/10001`,
  id: '10001',
  author: mockUser,
  body: 'This is a comment',
  updateAuthor: mockUser,
  created: '2024-01-01T11:00:00.000+0000',
  updated: '2024-01-01T11:00:00.000+0000',
};

const mockWorklog: JiraWorklog = {
  self: `${BASE_API}/issue/PROJ-42/worklog/20001`,
  id: '20001',
  issueId: '10042',
  author: mockUser,
  updateAuthor: mockUser,
  comment: 'Worked on this issue',
  created: '2024-01-01T12:00:00.000+0000',
  updated: '2024-01-01T12:00:00.000+0000',
  started: '2024-01-01T09:00:00.000+0000',
  timeSpent: '1h 30m',
  timeSpentSeconds: 5400,
};

const mockBoard: JiraBoard = {
  id: 42,
  self: `${BASE_AGILE}/board/42`,
  name: 'PROJ Board',
  type: 'scrum',
};

const mockSprint: JiraSprint = {
  id: 10,
  self: `${BASE_AGILE}/sprint/10`,
  state: 'active',
  name: 'Sprint 1',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-14T00:00:00.000Z',
  originBoardId: 42,
};

const mockSearchResponse: JiraSearchResponse = {
  startAt: 0,
  maxResults: 50,
  total: 1,
  issues: [mockIssue],
};

function pagedOf<T>(...values: T[]) {
  return { values, startAt: 0, maxResults: 50, total: values.length, isLast: true };
}

// ─── Test helpers ────────────────────────────────────────────────────────────

describe('JiraClient', () => {
  let client: JiraClient;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    client = new JiraClient({ apiUrl: API_URL, user: USER, token: TOKEN });
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockOk(data: unknown): void {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(data),
    } as Response);
  }

  function mockError(status: number, statusText: string): void {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status,
      statusText,
      json: () => Promise.resolve({ errorMessages: [statusText] }),
    } as Response);
  }

  // ─── Constructor ─────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('throws TypeError for an invalid apiUrl', () => {
      expect(() => new JiraClient({ apiUrl: 'not-a-url', user: USER, token: TOKEN })).toThrow(TypeError);
    });

    it('uses default apiPath of rest/api/latest', async () => {
      mockOk(mockIssue);
      await client.issue('PROJ-42').get();
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE_API}/issue/PROJ-42`,
        expect.any(Object),
      );
    });

    it('accepts a custom apiPath', async () => {
      const customClient = new JiraClient({
        apiUrl: API_URL,
        apiPath: 'rest/api/2',
        user: USER,
        token: TOKEN,
      });
      mockOk(mockIssue);
      await customClient.issue('PROJ-42').get();
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_URL}/rest/api/2/issue/PROJ-42`,
        expect.any(Object),
      );
    });
  });

  // ─── Event system ────────────────────────────────────────────────────────

  describe('on(request)', () => {
    it('emits request events on success', async () => {
      mockOk(mockIssue);
      const events: unknown[] = [];
      client.on('request', (e) => events.push(e));
      await client.issue('PROJ-42').get();
      expect(events).toHaveLength(1);
      expect((events[0] as { statusCode: number }).statusCode).toBe(200);
    });

    it('emits request events with error on failure', async () => {
      mockError(404, 'Not Found');
      const events: unknown[] = [];
      client.on('request', (e) => events.push(e));
      await expect(client.issue('PROJ-X').get()).rejects.toThrow(JiraApiError);
      expect((events[0] as { error: Error }).error).toBeInstanceOf(JiraApiError);
    });
  });

  // ─── Error handling ──────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws JiraApiError for a 404 response', async () => {
      mockError(404, 'Not Found');
      await expect(client.issue('PROJ-9999').get()).rejects.toThrow(JiraApiError);
    });

    it('throws JiraApiError with correct status and statusText', async () => {
      mockError(401, 'Unauthorized');
      try {
        await client.issue('PROJ-42').get();
      } catch (err) {
        expect(err).toBeInstanceOf(JiraApiError);
        expect((err as JiraApiError).status).toBe(401);
        expect((err as JiraApiError).statusText).toBe('Unauthorized');
        expect((err as JiraApiError).message).toBe('Jira API error: 401 Unauthorized');
      }
    });
  });

  // ─── search ──────────────────────────────────────────────────────────────

  describe('search', () => {
    it('calls GET /search without params', async () => {
      mockOk(mockSearchResponse);
      const result = await client.search();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/search`, expect.any(Object));
      expect(result.issues).toHaveLength(1);
    });

    it('appends JQL and pagination params', async () => {
      mockOk(mockSearchResponse);
      await client.search({ jql: 'project = PROJ', maxResults: 50, startAt: 0 });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('jql=project+%3D+PROJ');
      expect(url).toContain('maxResults=50');
    });
  });

  // ─── searchPost ──────────────────────────────────────────────────────────

  describe('searchPost', () => {
    it('calls POST /search with a body', async () => {
      mockOk(mockSearchResponse);
      await client.searchPost({ jql: 'project = PROJ', maxResults: 100 });
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE_API}/search`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  // ─── issue resource ──────────────────────────────────────────────────────

  describe('issue()', () => {
    it('awaits directly to get the issue', async () => {
      mockOk(mockIssue);
      const issue = await client.issue('PROJ-42');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42`, expect.any(Object));
      expect(issue.key).toBe('PROJ-42');
    });

    it('calls get() with fields param', async () => {
      mockOk(mockIssue);
      await client.issue('PROJ-42').get({ fields: 'summary,status' });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('fields=summary%2Cstatus');
    });

    it('calls comments()', async () => {
      const commentResponse: JiraCommentResponse = {
        comments: [mockComment],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };
      mockOk(commentResponse);
      const result = await client.issue('PROJ-42').comments();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42/comment`, expect.any(Object));
      expect(result.comments).toHaveLength(1);
    });

    it('calls comment(id)', async () => {
      mockOk(mockComment);
      await client.issue('PROJ-42').comment('10001');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42/comment/10001`, expect.any(Object));
    });

    it('calls worklogs()', async () => {
      const worklogResponse: JiraWorklogResponse = {
        worklogs: [mockWorklog],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };
      mockOk(worklogResponse);
      const result = await client.issue('PROJ-42').worklogs();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42/worklog`, expect.any(Object));
      expect(result.worklogs).toHaveLength(1);
    });

    it('calls worklog(id)', async () => {
      mockOk(mockWorklog);
      await client.issue('PROJ-42').worklog('20001');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42/worklog/20001`, expect.any(Object));
    });

    it('calls changelog()', async () => {
      const changelogResponse: JiraChangelogResponse = {
        startAt: 0,
        maxResults: 50,
        total: 1,
        histories: [{
          id: '1',
          author: mockUser,
          created: '2024-01-02T10:00:00.000+0000',
          items: [{ field: 'status', fieldtype: 'jira', fromString: 'Open', toString: 'In Progress' }],
        }],
      };
      mockOk(changelogResponse);
      const result = await client.issue('PROJ-42').changelog();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42/changelog`, expect.any(Object));
      expect(result.histories).toHaveLength(1);
    });

    it('calls transitions()', async () => {
      const mockTransition: JiraTransition = {
        id: '11',
        name: 'Start Progress',
        to: mockStatus,
        hasScreen: false,
        isGlobal: false,
        isInitial: false,
      };
      mockOk({ transitions: [mockTransition] });
      const result = await client.issue('PROJ-42').transitions();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42/transitions`, expect.any(Object));
      expect(result.transitions).toHaveLength(1);
    });

    it('calls remotelinks()', async () => {
      const remoteLink: JiraRemoteLink = {
        self: `${BASE_API}/issue/PROJ-42/remotelink/10000`,
        id: 10000,
        object: { url: 'https://example.com', title: 'External Link' },
      };
      mockOk([remoteLink]);
      const result = await client.issue('PROJ-42').remotelinks();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42/remotelink`, expect.any(Object));
      expect(result).toHaveLength(1);
    });

    it('calls remotelinks() with globalId filter', async () => {
      mockOk([]);
      await client.issue('PROJ-42').remotelinks('system=jira&issueId=10000');
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('globalId=');
    });

    it('calls votes()', async () => {
      const votes: JiraVotes = {
        self: `${BASE_API}/issue/PROJ-42/votes`,
        votes: 3,
        hasVoted: false,
      };
      mockOk(votes);
      const result = await client.issue('PROJ-42').votes();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42/votes`, expect.any(Object));
      expect(result.votes).toBe(3);
    });

    it('calls watchers()', async () => {
      const watchers: JiraWatchers = {
        self: `${BASE_API}/issue/PROJ-42/watchers`,
        isWatching: true,
        watchCount: 2,
        watchers: [mockUser],
      };
      mockOk(watchers);
      const result = await client.issue('PROJ-42').watchers();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/PROJ-42/watchers`, expect.any(Object));
      expect(result.watchCount).toBe(2);
    });
  });

  // ─── projects ────────────────────────────────────────────────────────────

  describe('projects()', () => {
    it('calls GET /project', async () => {
      mockOk([mockProject]);
      const result = await client.projects();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/project`, expect.any(Object));
      expect(result).toHaveLength(1);
    });

    it('appends expand param', async () => {
      mockOk([mockProject]);
      await client.projects({ expand: 'description,lead' });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('expand=description%2Clead');
    });
  });

  // ─── project resource ────────────────────────────────────────────────────

  describe('project()', () => {
    it('awaits directly to get the project', async () => {
      mockOk(mockProject);
      const project = await client.project('PROJ');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/project/PROJ`, expect.any(Object));
      expect(project.key).toBe('PROJ');
    });

    it('calls components()', async () => {
      const component: JiraComponent = { name: 'Backend', id: '10001' };
      mockOk([component]);
      const result = await client.project('PROJ').components();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/project/PROJ/components`, expect.any(Object));
      expect(result).toHaveLength(1);
    });

    it('calls versions()', async () => {
      const version: JiraVersion = { name: 'v1.0', id: '20001' };
      mockOk([version]);
      const result = await client.project('PROJ').versions();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/project/PROJ/versions`, expect.any(Object));
      expect(result).toHaveLength(1);
    });

    it('calls statuses()', async () => {
      mockOk([{ id: '1', name: 'Story', subtask: false, statuses: [mockStatus] }]);
      const result = await client.project('PROJ').statuses();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/project/PROJ/statuses`, expect.any(Object));
      expect(result).toHaveLength(1);
    });

    it('calls roles()', async () => {
      mockOk({ Administrator: `${BASE_API}/project/PROJ/role/10002` });
      const result = await client.project('PROJ').roles();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/project/PROJ/role`, expect.any(Object));
      expect(result).toHaveProperty('Administrator');
    });

    it('calls role(id)', async () => {
      mockOk({ self: `${BASE_API}/project/PROJ/role/10002`, name: 'Administrator', id: 10002, actors: [] });
      await client.project('PROJ').role(10002);
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/project/PROJ/role/10002`, expect.any(Object));
    });
  });

  // ─── users ───────────────────────────────────────────────────────────────

  describe('users()', () => {
    it('calls GET /user/search', async () => {
      mockOk([mockUser]);
      const result = await client.users({ username: 'pilmee' });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('/user/search');
      expect(url).toContain('username=pilmee');
      expect(result).toHaveLength(1);
    });
  });

  describe('user()', () => {
    it('calls GET /user with username', async () => {
      mockOk(mockUser);
      await client.user('pilmee');
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('/user');
      expect(url).toContain('username=pilmee');
    });
  });

  describe('currentUser()', () => {
    it('calls GET /myself', async () => {
      mockOk(mockUser);
      const result = await client.currentUser();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/myself`, expect.any(Object));
      expect(result.name).toBe('pilmee');
    });
  });

  // ─── boards ──────────────────────────────────────────────────────────────

  describe('boards()', () => {
    it('calls GET /board on the agile API path', async () => {
      mockOk(pagedOf(mockBoard));
      await client.boards();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_AGILE}/board`, expect.any(Object));
    });

    it('appends type and name params', async () => {
      mockOk(pagedOf(mockBoard));
      await client.boards({ type: 'scrum', name: 'PROJ' });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('type=scrum');
      expect(url).toContain('name=PROJ');
    });
  });

  // ─── board resource ──────────────────────────────────────────────────────

  describe('board()', () => {
    it('awaits directly to get the board', async () => {
      mockOk(mockBoard);
      const board = await client.board(42);
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_AGILE}/board/42`, expect.any(Object));
      expect(board.id).toBe(42);
    });

    it('calls sprints()', async () => {
      mockOk(pagedOf(mockSprint));
      const result = await client.board(42).sprints({ state: 'active' });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain(`${BASE_AGILE}/board/42/sprint`);
      expect(url).toContain('state=active');
      expect(result.values).toHaveLength(1);
    });

    it('calls issues()', async () => {
      mockOk(mockSearchResponse);
      await client.board(42).issues({ jql: 'status = Open' });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain(`${BASE_AGILE}/board/42/issue`);
    });

    it('calls backlog()', async () => {
      mockOk(mockSearchResponse);
      await client.board(42).backlog({ maxResults: 50 });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain(`${BASE_AGILE}/board/42/backlog`);
    });

    it('navigates to a sprint resource', async () => {
      mockOk(mockSprint);
      const sprint = await client.board(42).sprint(10);
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_AGILE}/sprint/10`, expect.any(Object));
      expect(sprint.id).toBe(10);
    });

    it('fetches sprint issues', async () => {
      mockOk(mockSearchResponse);
      await client.board(42).sprint(10).issues();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_AGILE}/sprint/10/issue`, expect.any(Object));
    });
  });

  // ─── metadata ────────────────────────────────────────────────────────────

  describe('issuetypes()', () => {
    it('calls GET /issuetype', async () => {
      mockOk([mockIssueType]);
      const result = await client.issuetypes();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issuetype`, expect.any(Object));
      expect(result).toHaveLength(1);
    });
  });

  describe('issuetype(id)', () => {
    it('calls GET /issuetype/{id}', async () => {
      mockOk(mockIssueType);
      await client.issuetype('1');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issuetype/1`, expect.any(Object));
    });
  });

  describe('priorities()', () => {
    it('calls GET /priority', async () => {
      mockOk([mockPriority]);
      const result = await client.priorities();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/priority`, expect.any(Object));
      expect(result).toHaveLength(1);
    });
  });

  describe('priority(id)', () => {
    it('calls GET /priority/{id}', async () => {
      mockOk(mockPriority);
      await client.priority('3');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/priority/3`, expect.any(Object));
    });
  });

  describe('statuses()', () => {
    it('calls GET /status', async () => {
      mockOk([mockStatus]);
      const result = await client.statuses();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/status`, expect.any(Object));
      expect(result).toHaveLength(1);
    });
  });

  describe('status(idOrName)', () => {
    it('calls GET /status/{id}', async () => {
      mockOk(mockStatus);
      await client.status('1');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/status/1`, expect.any(Object));
    });

    it('URL-encodes the status name', async () => {
      mockOk(mockStatus);
      await client.status('In Progress');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/status/In%20Progress`, expect.any(Object));
    });
  });

  describe('fields()', () => {
    it('calls GET /field', async () => {
      const field: JiraField = {
        id: 'summary',
        name: 'Summary',
        custom: false,
        orderable: true,
        navigable: true,
        searchable: true,
        clauseNames: ['summary'],
      };
      mockOk([field]);
      const result = await client.fields();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/field`, expect.any(Object));
      expect(result).toHaveLength(1);
    });
  });

  describe('issueLinkTypes()', () => {
    it('calls GET /issueLinkType', async () => {
      const linkType: JiraIssueLinkType = {
        id: '10000',
        name: 'Blocks',
        inward: 'is blocked by',
        outward: 'blocks',
      };
      mockOk({ issueLinkTypes: [linkType] });
      const result = await client.issueLinkTypes();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issueLinkType`, expect.any(Object));
      expect(result.issueLinkTypes).toHaveLength(1);
    });
  });

  describe('filter(id)', () => {
    it('calls GET /filter/{id}', async () => {
      const filter: JiraFilter = {
        self: `${BASE_API}/filter/10000`,
        id: '10000',
        name: 'My Open Issues',
        jql: 'assignee = currentUser() AND resolution = Unresolved',
      };
      mockOk(filter);
      const result = await client.filter('10000');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/filter/10000`, expect.any(Object));
      expect(result.id).toBe('10000');
    });
  });

  describe('favouriteFilters()', () => {
    it('calls GET /filter/favourite', async () => {
      mockOk([]);
      await client.favouriteFilters();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/filter/favourite`, expect.any(Object));
    });
  });

  describe('component(id)', () => {
    it('calls GET /component/{id}', async () => {
      const component: JiraComponent = { self: `${BASE_API}/component/10001`, id: '10001', name: 'Backend' };
      mockOk(component);
      await client.component('10001');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/component/10001`, expect.any(Object));
    });
  });

  describe('version(id)', () => {
    it('calls GET /version/{id}', async () => {
      const version: JiraVersion = { self: `${BASE_API}/version/20001`, id: '20001', name: 'v1.0' };
      mockOk(version);
      await client.version('20001');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/version/20001`, expect.any(Object));
    });
  });

  describe('versionIssueCounts(id)', () => {
    it('calls GET /version/{id}/relatedIssueCounts', async () => {
      mockOk({ self: `${BASE_API}/version/20001/relatedIssueCounts`, issuesFixedCount: 5, issuesAffectedCount: 2, issueCountWithCustomFieldsShowingVersion: 0, customFieldUsage: [] });
      await client.versionIssueCounts('20001');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/version/20001/relatedIssueCounts`, expect.any(Object));
    });
  });

  describe('versionUnresolvedIssueCount(id)', () => {
    it('calls GET /version/{id}/unresolvedIssueCount', async () => {
      mockOk({ self: `${BASE_API}/version/20001/unresolvedIssueCount`, issuesUnresolvedCount: 3 });
      await client.versionUnresolvedIssueCount('20001');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/version/20001/unresolvedIssueCount`, expect.any(Object));
    });
  });
});
