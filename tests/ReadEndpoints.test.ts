import { JiraClient } from '../src/JiraClient';
import type { JiraServerInfo } from '../src/domain/ServerInfo';
import type { JiraPermissionsResponse } from '../src/domain/Permission';
import type { JiraEditMeta, JiraCreateMetaIssueTypes, JiraCreateMetaFields } from '../src/domain/Meta';
import type { JiraIssuePickerResponse } from '../src/domain/IssuePicker';
import type { JiraGroupsPickerResponse } from '../src/domain/Group';
import type { JiraDashboard, JiraDashboardsResponse } from '../src/domain/Dashboard';
import type { JiraProjectCategory } from '../src/domain/ProjectCategory';
import type { JiraWorkflow } from '../src/domain/Workflow';
import type { JiraCustomFieldOption } from '../src/domain/CustomFieldOption';
import type { JiraEpic } from '../src/domain/Epic';
import type { JiraResolution } from '../src/domain/Issue';
import type { JiraStatusCategory } from '../src/domain/Status';
import type { JiraAttachment, JiraAttachmentMeta } from '../src/domain/Attachment';
import type { JiraFilterColumn, JiraFilterPermission } from '../src/domain/Filter';
import type { JiraUser } from '../src/domain/User';
import type { JiraSearchResponse } from '../src/domain/IssueSearch';
import type { PagedResponse } from '../src/domain/Pagination';
import type { JiraVersion } from '../src/domain/Version';
import type { JiraBoardProject } from '../src/domain/Board';

const API_URL = 'https://jira.example.com';
const BASE_API = `${API_URL}/rest/api/latest`;
const BASE_AGILE = `${API_URL}/rest/agile/latest`;

// ─── Mock fixtures ───────────────────────────────────────────────────────────

const mockServerInfo: JiraServerInfo = {
  baseUrl: API_URL,
  version: '10.3.0',
  versionNumbers: [10, 3, 0],
  deploymentType: 'Server',
  buildNumber: 100300,
  serverTime: '2026-07-19T12:00:00.000+0000',
};

const mockPermissions: JiraPermissionsResponse = {
  permissions: {
    BROWSE_PROJECTS: { id: '10', key: 'BROWSE_PROJECTS', name: 'Browse Projects', type: 'PROJECT', havePermission: true },
  },
};

const mockResolution: JiraResolution = { self: `${BASE_API}/resolution/1`, id: '1', name: 'Fixed', description: 'Work done.' };

const mockStatusCategory: JiraStatusCategory = { self: `${BASE_API}/statuscategory/3`, id: 3, key: 'done', name: 'Done', colorName: 'green' };

const mockEditMeta: JiraEditMeta = {
  fields: {
    summary: { required: true, name: 'Summary', fieldId: 'summary', operations: ['set'], schema: { type: 'string', system: 'summary' } },
    customfield_10010: { required: false, name: 'Epic Link', fieldId: 'customfield_10010', schema: { type: 'any', custom: 'com.pyxis.greenhopper.jira:gh-epic-link', customId: 10010 } },
  },
};

const mockCreateMetaIssueTypes: JiraCreateMetaIssueTypes = {
  startAt: 0, maxResults: 50, total: 1,
  values: [{ self: `${BASE_API}/issuetype/1`, id: '1', name: 'Story', subtask: false }],
};

const mockCreateMetaFields: JiraCreateMetaFields = {
  startAt: 0, maxResults: 50, total: 1,
  values: [{ required: true, name: 'Summary', fieldId: 'summary', schema: { type: 'string', system: 'summary' } }],
};

const mockPicker: JiraIssuePickerResponse = {
  sections: [{ label: 'Current Search', id: 'cs', issues: [{ key: 'OPS-1', summaryText: 'Connection timeout' }] }],
};

const mockAttachment: JiraAttachment = {
  self: `${BASE_API}/attachment/1000`, id: '1000', filename: 'log.txt', created: '2026-07-01T10:00:00.000+0000',
  size: 2048, mimeType: 'text/plain', content: `${API_URL}/secure/attachment/1000/log.txt`,
};

const mockAttachmentMeta: JiraAttachmentMeta = { enabled: true, uploadLimit: 10485760 };

const mockGroups: JiraGroupsPickerResponse = {
  header: 'Showing 1 of 1 matching groups', total: 1, groups: [{ name: 'jira-developers', html: '<b>jira-dev</b>elopers' }],
};

const mockUser: JiraUser = { self: `${BASE_API}/user?username=pilmee`, key: 'pilmee', name: 'pilmee', displayName: 'Pilmee', active: true } as JiraUser;

const mockDashboard: JiraDashboard = { id: '10000', name: 'System Dashboard', self: `${BASE_API}/dashboard/10000` };
const mockDashboards: JiraDashboardsResponse = { startAt: 0, maxResults: 20, total: 1, dashboards: [mockDashboard] };

const mockCategory: JiraProjectCategory = { self: `${BASE_API}/projectCategory/1`, id: '1', name: 'Internal' };
const mockWorkflow: JiraWorkflow = { name: 'jira', description: 'Default workflow', steps: 5, default: true };
const mockOption: JiraCustomFieldOption = { self: `${BASE_API}/customFieldOption/10001`, value: 'Blue' };

const mockColumns: JiraFilterColumn[] = [{ label: 'Key', value: 'issuekey' }, { label: 'Summary', value: 'summary' }];
const mockFilterPermissions: JiraFilterPermission[] = [{ id: 1, type: 'group', group: { name: 'jira-users' } }];

const mockEpic: JiraEpic = { id: 7, key: 'OPS-10', self: `${BASE_AGILE}/epic/7`, name: 'Checkout revamp', summary: 'Revamp checkout', color: { key: 'color_2' }, done: false };

const mockSearch: JiraSearchResponse = { startAt: 0, maxResults: 50, total: 0, issues: [] } as unknown as JiraSearchResponse;

const mockVersions: PagedResponse<JiraVersion> = { startAt: 0, maxResults: 50, total: 1, isLast: true, values: [{ id: '20001', name: '1.1.0', released: false, projectId: 1 }] };
const mockBoardProjects: PagedResponse<JiraBoardProject> = { startAt: 0, maxResults: 50, total: 1, isLast: true, values: [{ id: '1', key: 'OPS', name: 'Operations' } as unknown as JiraBoardProject] };
const mockEpics: PagedResponse<JiraEpic> = { startAt: 0, maxResults: 50, total: 1, isLast: true, values: [mockEpic] };

describe('JiraClient read endpoints (P0 batch)', () => {
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

  const requestedUrl = (): URL => new URL(fetchMock.mock.calls[0][0] as string);

  describe('instance & permissions', () => {
    it('fetches server info', async () => {
      mockJson(mockServerInfo);
      const info = await jira.serverInfo();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/serverInfo`, expect.any(Object));
      expect(info.versionNumbers[0]).toBe(10);
    });

    it('fetches my permissions with project context', async () => {
      mockJson(mockPermissions);
      const { permissions } = await jira.myPermissions({ projectKey: 'OPS' });
      expect(requestedUrl().pathname).toContain('/mypermissions');
      expect(requestedUrl().searchParams.get('projectKey')).toBe('OPS');
      expect(permissions.BROWSE_PROJECTS.havePermission).toBe(true);
    });

    it('fetches all permissions', async () => {
      mockJson(mockPermissions);
      await jira.permissions();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/permissions`, expect.any(Object));
    });
  });

  describe('metadata', () => {
    it('fetches resolutions and a single resolution', async () => {
      mockJson([mockResolution]);
      expect(await jira.resolutions()).toEqual([mockResolution]);
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/resolution`, expect.any(Object));

      mockJson(mockResolution);
      expect(await jira.resolution('1')).toEqual(mockResolution);
      expect(fetchMock).toHaveBeenLastCalledWith(`${BASE_API}/resolution/1`, expect.any(Object));
    });

    it('fetches status categories and a single category', async () => {
      mockJson([mockStatusCategory]);
      expect(await jira.statusCategories()).toEqual([mockStatusCategory]);
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/statuscategory`, expect.any(Object));

      mockJson(mockStatusCategory);
      expect(await jira.statusCategory('done')).toEqual(mockStatusCategory);
      expect(fetchMock).toHaveBeenLastCalledWith(`${BASE_API}/statuscategory/done`, expect.any(Object));
    });

    it('fetches project categories and a single one', async () => {
      mockJson([mockCategory]);
      expect(await jira.projectCategories()).toEqual([mockCategory]);
      mockJson(mockCategory);
      expect(await jira.projectCategory(1)).toEqual(mockCategory);
      expect(fetchMock).toHaveBeenLastCalledWith(`${BASE_API}/projectCategory/1`, expect.any(Object));
    });

    it('fetches workflows', async () => {
      mockJson([mockWorkflow]);
      expect(await jira.workflows()).toEqual([mockWorkflow]);
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/workflow`, expect.any(Object));
    });

    it('fetches a custom field option', async () => {
      mockJson(mockOption);
      expect(await jira.customFieldOption(10001)).toEqual(mockOption);
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/customFieldOption/10001`, expect.any(Object));
    });
  });

  describe('attachments', () => {
    it('fetches attachment metadata and global settings', async () => {
      mockJson(mockAttachment);
      expect(await jira.attachment(1000)).toEqual(mockAttachment);
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/attachment/1000`, expect.any(Object));

      mockJson(mockAttachmentMeta);
      expect(await jira.attachmentMeta()).toEqual(mockAttachmentMeta);
      expect(fetchMock).toHaveBeenLastCalledWith(`${BASE_API}/attachment/meta`, expect.any(Object));
    });
  });

  describe('groups', () => {
    it('searches groups via the picker', async () => {
      mockJson(mockGroups);
      const result = await jira.groupsPicker({ query: 'jira-dev', maxResults: 10 });
      expect(requestedUrl().pathname).toContain('/groups/picker');
      expect(requestedUrl().searchParams.get('query')).toBe('jira-dev');
      expect(result.groups[0].name).toBe('jira-developers');
    });

    it('fetches group members', async () => {
      mockJson({ startAt: 0, maxResults: 50, total: 1, isLast: true, values: [mockUser] });
      const members = await jira.groupMembers({ groupname: 'jira-developers', includeInactiveUsers: false });
      expect(requestedUrl().pathname).toContain('/group/member');
      expect(requestedUrl().searchParams.get('groupname')).toBe('jira-developers');
      expect(requestedUrl().searchParams.get('includeInactiveUsers')).toBe('false');
      expect(members.values[0].name).toBe('pilmee');
    });
  });

  describe('dashboards', () => {
    it('fetches dashboards with filter and a single dashboard', async () => {
      mockJson(mockDashboards);
      const result = await jira.dashboards({ filter: 'favourite' });
      expect(requestedUrl().searchParams.get('filter')).toBe('favourite');
      expect(result.dashboards).toHaveLength(1);

      mockJson(mockDashboard);
      expect(await jira.dashboard('10000')).toEqual(mockDashboard);
      expect(fetchMock).toHaveBeenLastCalledWith(`${BASE_API}/dashboard/10000`, expect.any(Object));
    });
  });

  describe('issue picker', () => {
    it('fetches issue suggestions', async () => {
      mockJson(mockPicker);
      const result = await jira.issuePicker({ query: 'timeout', currentJQL: 'project = OPS', showSubTasks: true });
      expect(requestedUrl().pathname).toContain('/issue/picker');
      expect(requestedUrl().searchParams.get('query')).toBe('timeout');
      expect(requestedUrl().searchParams.get('currentJQL')).toBe('project = OPS');
      expect(requestedUrl().searchParams.get('showSubTasks')).toBe('true');
      expect(result.sections[0].issues[0].key).toBe('OPS-1');
    });
  });

  describe('filters', () => {
    it('fetches filter columns and permissions', async () => {
      mockJson(mockColumns);
      expect(await jira.filterColumns(10000)).toEqual(mockColumns);
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/filter/10000/columns`, expect.any(Object));

      mockJson(mockFilterPermissions);
      expect(await jira.filterPermissions(10000)).toEqual(mockFilterPermissions);
      expect(fetchMock).toHaveBeenLastCalledWith(`${BASE_API}/filter/10000/permission`, expect.any(Object));
    });
  });

  describe('issue & project metadata resources', () => {
    it('fetches issue editmeta', async () => {
      mockJson(mockEditMeta);
      const meta = await jira.issue('OPS-1').editmeta();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/OPS-1/editmeta`, expect.any(Object));
      expect(meta.fields.summary.required).toBe(true);
    });

    it('fetches createmeta issue types for a project', async () => {
      mockJson(mockCreateMetaIssueTypes);
      const result = await jira.project('OPS').createmetaIssueTypes({ maxResults: 50 });
      expect(requestedUrl().pathname).toContain('/issue/createmeta/OPS/issuetypes');
      expect(requestedUrl().searchParams.get('maxResults')).toBe('50');
      expect(result.values[0].name).toBe('Story');
    });

    it('fetches createmeta fields for a project and issue type', async () => {
      mockJson(mockCreateMetaFields);
      const result = await jira.project('OPS').createmetaFields('1');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_API}/issue/createmeta/OPS/issuetypes/1`, expect.any(Object));
      expect(result.values[0].fieldId).toBe('summary');
    });
  });

  describe('epics (Agile)', () => {
    it('fetches an epic directly by awaiting the resource', async () => {
      mockJson(mockEpic);
      const epic = await jira.epic('OPS-10');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_AGILE}/epic/OPS-10`, expect.any(Object));
      expect(epic.name).toBe('Checkout revamp');
    });

    it('fetches epic issues with params', async () => {
      mockJson(mockSearch);
      await jira.epic(7).issues({ maxResults: 100 });
      expect(requestedUrl().pathname).toContain('/rest/agile/latest/epic/7/issue');
      expect(requestedUrl().searchParams.get('maxResults')).toBe('100');
    });

    it('fetches issues without an epic via epic("none")', async () => {
      mockJson(mockSearch);
      await jira.epic('none').issues();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_AGILE}/epic/none/issue`, expect.any(Object));
    });
  });

  describe('board extensions (Agile)', () => {
    it('fetches board epics', async () => {
      mockJson(mockEpics);
      const epics = await jira.board(42).epics({ done: false });
      expect(requestedUrl().pathname).toContain('/rest/agile/latest/board/42/epic');
      expect(requestedUrl().searchParams.get('done')).toBe('false');
      expect(epics.values[0].key).toBe('OPS-10');
    });

    it('fetches board issues without epic', async () => {
      mockJson(mockSearch);
      await jira.board(42).issuesWithoutEpic({ jql: 'status = Open' });
      expect(requestedUrl().pathname).toContain('/rest/agile/latest/board/42/epic/none/issue');
      expect(requestedUrl().searchParams.get('jql')).toBe('status = Open');
    });

    it('fetches board issues for an epic', async () => {
      mockJson(mockSearch);
      await jira.board(42).epicIssues(7, { maxResults: 25 });
      expect(requestedUrl().pathname).toContain('/rest/agile/latest/board/42/epic/7/issue');
    });

    it('fetches board projects', async () => {
      mockJson(mockBoardProjects);
      const projects = await jira.board(42).projects();
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_AGILE}/board/42/project`, expect.any(Object));
      expect(projects.values[0].key).toBe('OPS');
    });

    it('fetches board versions', async () => {
      mockJson(mockVersions);
      const versions = await jira.board(42).versions({ released: false });
      expect(requestedUrl().pathname).toContain('/rest/agile/latest/board/42/version');
      expect(requestedUrl().searchParams.get('released')).toBe('false');
      expect(versions.values[0].name).toBe('1.1.0');
    });
  });
});
