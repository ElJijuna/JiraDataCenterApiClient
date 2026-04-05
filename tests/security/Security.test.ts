import { Security } from '../../src/security/Security';

describe('Security', () => {
  describe('constructor', () => {
    it('accepts a valid URL', () => {
      expect(() => new Security('https://jira.example.com', 'user', 'token')).not.toThrow();
    });

    it('strips a trailing slash from apiUrl', () => {
      const security = new Security('https://jira.example.com/', 'user', 'token');
      expect(security.getApiUrl()).toBe('https://jira.example.com');
    });

    it('throws TypeError for an invalid URL', () => {
      expect(() => new Security('not-a-url', 'user', 'token')).toThrow(TypeError);
      expect(() => new Security('not-a-url', 'user', 'token')).toThrow(
        'Invalid apiUrl: "not-a-url" is not a valid URL',
      );
    });
  });

  describe('getApiUrl', () => {
    it('returns the base URL without trailing slash', () => {
      const security = new Security('https://jira.example.com', 'user', 'token');
      expect(security.getApiUrl()).toBe('https://jira.example.com');
    });
  });

  describe('getAuthorizationHeader', () => {
    it('returns a Basic auth header with Base64-encoded credentials', () => {
      const security = new Security('https://jira.example.com', 'user', 'my-token');
      const encoded = Buffer.from('user:my-token').toString('base64');
      expect(security.getAuthorizationHeader()).toBe(`Basic ${encoded}`);
    });
  });

  describe('getHeaders', () => {
    it('returns Authorization, Content-Type, and Accept headers', () => {
      const security = new Security('https://jira.example.com', 'user', 'my-token');
      const headers = security.getHeaders();
      const encoded = Buffer.from('user:my-token').toString('base64');
      expect(headers).toEqual({
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      });
    });
  });
});
