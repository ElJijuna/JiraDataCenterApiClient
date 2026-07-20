import { JiraApiError } from '../src/errors/JiraApiError';
import { JiraClient, type RetryEvent } from '../src/JiraClient';

const API_URL = 'https://jira.example.com';

describe('retry & timeout', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  const makeClient = (options?: {
    timeoutMs?: number;
    retry?: { retries?: number; baseDelayMs?: number; maxDelayMs?: number; retryOn?: number[] };
  }): JiraClient =>
    new JiraClient({ apiUrl: API_URL, user: 'pilmee', token: 'my-token', ...options });
  const mockOk = <T>(data: T): void => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(data),
    } as Response);
  };
  const mockStatus = (
    status: number,
    statusText: string,
    headers?: Record<string, string>,
  ): void => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status,
      statusText,
      headers: headers ? { get: (name: string) => headers[name.toLowerCase()] ?? null } : undefined,
      json: () => Promise.resolve({}),
    } as unknown as Response);
  };

  it('does not retry by default', async () => {
    mockStatus(503, 'Service Unavailable');
    await expect(makeClient().serverInfo()).rejects.toThrow(JiraApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries retryable statuses with exponential backoff and emits retry events', async () => {
    const jira = makeClient({ retry: { retries: 2, baseDelayMs: 1 } });
    const events: RetryEvent[] = [];

    jira.on('retry', (event) => events.push(event));

    mockStatus(429, 'Too Many Requests');
    mockStatus(503, 'Service Unavailable');
    mockOk({ baseUrl: API_URL, version: '10.3.0', versionNumbers: [10, 3, 0], buildNumber: 1 });

    const info = await jira.serverInfo();

    expect(info.version).toBe('10.3.0');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ method: 'GET', attempt: 1, delayMs: 1, statusCode: 429 });
    expect(events[1]).toMatchObject({ attempt: 2, delayMs: 2, statusCode: 503 });
  });

  it('honors the Retry-After header, capped by maxDelayMs', async () => {
    const jira = makeClient({ retry: { retries: 1, baseDelayMs: 1, maxDelayMs: 50 } });
    const events: RetryEvent[] = [];

    jira.on('retry', (event) => events.push(event));

    mockStatus(429, 'Too Many Requests', { 'retry-after': '120' });
    mockOk([]);

    await jira.resolutions();
    expect(events[0].delayMs).toBe(50);
  });

  it('does not retry non-retryable statuses', async () => {
    const jira = makeClient({ retry: { retries: 3, baseDelayMs: 1 } });

    mockStatus(404, 'Not Found');
    await expect(jira.serverInfo()).rejects.toThrow('404');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws the API error once retries are exhausted', async () => {
    const jira = makeClient({ retry: { retries: 1, baseDelayMs: 1 } });

    mockStatus(503, 'Service Unavailable');
    mockStatus(503, 'Service Unavailable');
    await expect(jira.serverInfo()).rejects.toThrow(JiraApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries network errors on POST requests too', async () => {
    const jira = makeClient({ retry: { retries: 1, baseDelayMs: 1 } });
    const events: RetryEvent[] = [];

    jira.on('retry', (event) => events.push(event));

    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    mockOk({ startAt: 0, maxResults: 0, total: 0, issues: [] });

    await jira.searchPost({ jql: 'project = OPS' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(events[0]).toMatchObject({ method: 'POST', attempt: 1 });
    expect(events[0].error?.message).toBe('fetch failed');
  });

  it('respects custom retryOn statuses', async () => {
    const jira = makeClient({ retry: { retries: 1, baseDelayMs: 1, retryOn: [500] } });

    mockStatus(500, 'Internal Server Error');
    mockOk([]);
    await jira.resolutions();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts requests that exceed timeoutMs', async () => {
    const jira = makeClient({ timeoutMs: 5 });

    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason as Error));
        }),
    );
    await expect(jira.serverInfo()).rejects.toThrow('timed out after 5ms');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to backoff when the Retry-After header is unparsable', async () => {
    const jira = makeClient({ retry: { retries: 1, baseDelayMs: 1 } });
    const events: RetryEvent[] = [];

    jira.on('retry', (event) => events.push(event));

    mockStatus(429, 'Too Many Requests', { 'retry-after': 'soon' });
    mockOk([]);

    await jira.resolutions();
    expect(events[0].delayMs).toBe(1);
  });

  it('stops retrying when the signal aborts during the backoff wait', async () => {
    const jira = makeClient({ retry: { retries: 3, baseDelayMs: 60_000 } });
    const controller = new AbortController();

    fetchMock.mockImplementationOnce(() => {
      controller.abort(new Error('shutting down'));

      return Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({}),
      } as Response);
    });

    await expect(
      jira.searchAll({ jql: 'project = OPS' }, { signal: controller.signal }).next(),
    ).rejects.toThrow('shutting down');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries after a timeout when retries are configured', async () => {
    const jira = makeClient({ timeoutMs: 5, retry: { retries: 1, baseDelayMs: 1 } });

    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason as Error));
        }),
    );
    mockOk([]);
    await jira.resolutions();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
