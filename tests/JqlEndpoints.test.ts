import type { JiraJqlAutocompleteData, JiraJqlSuggestionsResponse } from '../src/domain/Jql';
import { JiraApiError } from '../src/errors/JiraApiError';
import { JiraClient } from '../src/JiraClient';
import { jql } from '../src/jql/JqlBuilder';

const API_URL = 'https://jira.example.com';
const BASE_API = `${API_URL}/rest/api/latest`;
const mockAutocompleteData: JiraJqlAutocompleteData = {
  visibleFieldNames: [
    {
      value: 'status',
      displayName: 'Status',
      orderable: 'true',
      searchable: 'true',
      operators: ['=', '!=', 'in'],
      types: ['com.atlassian.jira.issue.status.Status'],
    },
    {
      value: 'cf[10010]',
      displayName: 'Epic Link - cf[10010]',
      cfid: 'cf[10010]',
      operators: ['='],
      types: [],
    },
  ],
  visibleFunctionNames: [
    {
      value: 'currentUser()',
      displayName: 'currentUser()',
      types: ['com.atlassian.crowd.embedded.api.User'],
    },
  ],
  jqlReservedWords: ['and', 'or', 'not'],
};
const mockSuggestions: JiraJqlSuggestionsResponse = {
  results: [{ value: 'Open', displayName: '<b>Op</b>en' }],
};
const captureError = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (err) {
    return err;
  }

  throw new Error('Expected the request to fail');
};

describe('JiraClient JQL endpoints', () => {
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
  const mockError = (status: number, statusText: string, body?: unknown): void => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status,
      statusText,
      json: () =>
        body === undefined ? Promise.reject(new Error('no body')) : Promise.resolve(body),
    } as Response);
  };

  describe('jqlAutocompleteData', () => {
    it('fetches JQL reference data', async () => {
      mockJson(mockAutocompleteData);
      const data = await jira.jqlAutocompleteData();

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE_API}/jql/autocompletedata`,
        expect.any(Object),
      );
      expect(data.visibleFieldNames[1].value).toBe('cf[10010]');
      expect(data.jqlReservedWords).toContain('and');
    });
  });

  describe('jqlAutocompleteSuggestions', () => {
    it('fetches suggestions with query params', async () => {
      mockJson(mockSuggestions);
      const data = await jira.jqlAutocompleteSuggestions({ fieldName: 'status', fieldValue: 'Op' });
      const url = fetchMock.mock.calls[0][0] as string;

      expect(url).toContain(`${BASE_API}/jql/autocompletedata/suggestions?`);
      expect(url).toContain('fieldName=status');
      expect(url).toContain('fieldValue=Op');
      expect(data.results[0].value).toBe('Open');
    });
  });

  describe('validateJql', () => {
    it('returns valid for accepted queries and sends validateQuery + maxResults=0', async () => {
      mockJson({ issues: [], total: 0 });
      const result = await jira.validateJql('project = OPS');
      const url = new URL(fetchMock.mock.calls[0][0] as string);

      expect(url.href).toContain(`${BASE_API}/search?`);
      expect(url.searchParams.get('jql')).toBe('project = OPS');
      expect(url.searchParams.get('maxResults')).toBe('0');
      expect(url.searchParams.get('validateQuery')).toBe('true');
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('accepts a JqlBuilder and stringifies it', async () => {
      mockJson({ issues: [], total: 0 });
      await jira.validateJql(jql().project('OPS').status('Open'));
      const url = new URL(fetchMock.mock.calls[0][0] as string);

      expect(url.searchParams.get('jql')).toBe('project = "OPS" AND status = "Open"');
    });

    it('returns server error messages on 400', async () => {
      mockError(400, 'Bad Request', { errorMessages: ["Field 'proyect' does not exist."] });
      const result = await jira.validateJql('proyect = OPS');

      expect(result).toEqual({ valid: false, errors: ["Field 'proyect' does not exist."] });
    });

    it('falls back to the generic message when the 400 body has no errorMessages', async () => {
      mockError(400, 'Bad Request', {});
      const result = await jira.validateJql('broken =');

      expect(result).toEqual({ valid: false, errors: ['Jira API error: 400 Bad Request'] });
    });

    it('rethrows non-400 errors', async () => {
      mockError(500, 'Internal Server Error', { errorMessages: ['boom'] });
      await expect(jira.validateJql('project = OPS')).rejects.toThrow(JiraApiError);
    });
  });

  describe('JiraApiError body parsing', () => {
    it('captures errorMessages and per-field errors from the response body', async () => {
      mockError(400, 'Bad Request', {
        errorMessages: ['first', 'second', 42],
        errors: { jql: 'is broken', count: 7 },
      });
      const err = (await captureError(jira.search({ jql: 'x =' }))) as JiraApiError;

      expect(err).toBeInstanceOf(JiraApiError);
      expect(err.errorMessages).toEqual(['first', 'second']);
      expect(err.errors).toEqual({ jql: 'is broken' });
    });

    it('tolerates error responses without a JSON body', async () => {
      mockError(503, 'Service Unavailable');
      const err = (await captureError(jira.search({ jql: 'x' }))) as JiraApiError;

      expect(err).toBeInstanceOf(JiraApiError);
      expect(err.errorMessages).toEqual([]);
      expect(err.errors).toEqual({});
    });

    it('parses error bodies on POST requests too', async () => {
      mockError(400, 'Bad Request', { errorMessages: ['bad jql'] });
      const err = (await captureError(jira.searchPost({ jql: 'x =' }))) as JiraApiError;

      expect(err).toBeInstanceOf(JiraApiError);
      expect(err.errorMessages).toEqual(['bad jql']);
    });
  });
});
