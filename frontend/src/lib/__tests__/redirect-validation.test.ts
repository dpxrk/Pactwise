import { validateRedirectUrl } from '../redirect-validation';

// Mock window.location for testing
const mockLocation = {
  origin: 'https://app.pactwise.com',
  href: 'https://app.pactwise.com/',
};

// @ts-ignore
global.window = { location: mockLocation };

describe('validateRedirectUrl', () => {
  describe('Safe redirects (should allow)', () => {
    it('should allow relative paths starting with /', () => {
      expect(validateRedirectUrl('/dashboard')).toBe('/dashboard');
      expect(validateRedirectUrl('/contracts/123')).toBe('/contracts/123');
      expect(validateRedirectUrl('/settings?tab=profile')).toBe('/settings?tab=profile');
      expect(validateRedirectUrl('/vendors#list')).toBe('/vendors#list');
    });

    it('should allow same-origin absolute URLs', () => {
      expect(validateRedirectUrl('https://app.pactwise.com/dashboard')).toBe('/dashboard');
      expect(validateRedirectUrl('https://app.pactwise.com/contracts/123?view=detail')).toBe(
        '/contracts/123?view=detail'
      );
    });

    it('should use fallback for empty/null/undefined values', () => {
      expect(validateRedirectUrl(null)).toBe('/dashboard');
      expect(validateRedirectUrl(undefined)).toBe('/dashboard');
      expect(validateRedirectUrl('')).toBe('/dashboard');
      expect(validateRedirectUrl('   ')).toBe('/dashboard');
    });

    it('should allow custom fallback URL', () => {
      expect(validateRedirectUrl(null, '/home')).toBe('/home');
      expect(validateRedirectUrl('', '/onboarding')).toBe('/onboarding');
    });
  });

  describe('Unsafe redirects (should block)', () => {
    it('should block protocol-relative URLs', () => {
      expect(validateRedirectUrl('//evil.com')).toBe('/dashboard');
      expect(validateRedirectUrl('//evil.com/phishing')).toBe('/dashboard');
    });

    it('should block external absolute URLs', () => {
      expect(validateRedirectUrl('https://evil.com')).toBe('/dashboard');
      expect(validateRedirectUrl('https://evil.com/phishing')).toBe('/dashboard');
      expect(validateRedirectUrl('http://attacker.com')).toBe('/dashboard');
    });

    it('should block javascript: protocol', () => {
      expect(validateRedirectUrl('javascript:alert(1)')).toBe('/dashboard');
      expect(validateRedirectUrl('javascript:void(0)')).toBe('/dashboard');
    });

    it('should block data: protocol', () => {
      expect(validateRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
    });

    it('should block different subdomain URLs', () => {
      expect(validateRedirectUrl('https://evil.pactwise.com/steal')).toBe('/dashboard');
      expect(validateRedirectUrl('https://subdomain.pactwise.com')).toBe('/dashboard');
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed URLs gracefully', () => {
      expect(validateRedirectUrl('not a url at all')).toBe('/dashboard');
      expect(validateRedirectUrl('ht!tp://bad')).toBe('/dashboard');
      expect(validateRedirectUrl('://noprotocol')).toBe('/dashboard');
    });

    it('should preserve query parameters and hashes in relative URLs', () => {
      expect(validateRedirectUrl('/dashboard?foo=bar&baz=qux')).toBe('/dashboard?foo=bar&baz=qux');
      expect(validateRedirectUrl('/page#section')).toBe('/page#section');
      expect(validateRedirectUrl('/page?query=1#anchor')).toBe('/page?query=1#anchor');
    });
  });
});
