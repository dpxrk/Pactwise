import { describe, it, expect } from 'vitest';
import {
  getRateLimitRules,
  shouldBypassRateLimit,
  rateLimitProfiles,
  DynamicRateLimitAdjuster,
} from '@functions/_shared/rate-limit-config';

describe('Rate Limit Configuration', () => {
  describe('getRateLimitRules', () => {
    it('should return anonymous rules for unauthenticated users', () => {
      const rules = getRateLimitRules({
        isAuthenticated: false,
      });

      expect(rules).toHaveLength(3);
      expect(rules.some(rule => rule.id === 'anon_api_general')).toBe(true);
      expect(rules.some(rule => rule.scope === 'ip')).toBe(true);
    });

    it('should return standard rules for authenticated users', () => {
      const rules = getRateLimitRules({
        isAuthenticated: true,
        userTier: 'free',
      });

      expect(rules).toHaveLength(3);
      expect(rules.some(rule => rule.id === 'std_api_general')).toBe(true);
      expect(rules.some(rule => rule.scope === 'user')).toBe(true);
    });

    it('should return professional rules for professional users', () => {
      const rules = getRateLimitRules({
        isAuthenticated: true,
        userTier: 'professional',
      });

      expect(rules).toHaveLength(3);
      expect(rules.some(rule => rule.id === 'prof_api_general')).toBe(true);
      expect(rules[0].maxRequests).toBeGreaterThan(100); // Professional should have higher limits
    });

    it('should return enterprise rules for enterprise users', () => {
      const rules = getRateLimitRules({
        isAuthenticated: true,
        userTier: 'enterprise',
      });

      expect(rules).toHaveLength(3);
      expect(rules.some(rule => rule.id === 'ent_api_general')).toBe(true);
      expect(rules[0].maxRequests).toBeGreaterThan(300); // Enterprise should have highest limits
    });

    it('should return security rules when in security mode', () => {
      const rules = getRateLimitRules({
        isAuthenticated: true,
        userTier: 'professional',
        isSecurityMode: true,
      });

      expect(rules).toHaveLength(3);
      expect(rules.some(rule => rule.id === 'sec_api_restricted')).toBe(true);
      expect(rules[0].maxRequests).toBeLessThan(20); // Security mode should be very restrictive
    });

    it('should filter rules by endpoint', () => {
      const rules = getRateLimitRules({
        isAuthenticated: true,
        userTier: 'free',
        endpoint: '/ai-analysis',
      });

      // Should only include rules that apply to /ai-analysis or general rules
      expect(rules.length).toBeGreaterThan(0);
      const hasEndpointSpecificRule = rules.some(rule => rule.endpoint === '/ai-analysis');
      expect(hasEndpointSpecificRule).toBe(true);
    });
  });

  describe('shouldBypassRateLimit', () => {
    it('should bypass for trusted IPs', () => {
      const mockRequest = new Request('http://localhost:3000/test', {
        headers: {
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const shouldBypass = shouldBypassRateLimit(mockRequest);
      expect(shouldBypass).toBe(true);
    });

    it('should bypass for health check endpoints', () => {
      const mockRequest = new Request('http://localhost:3000/health');
      const shouldBypass = shouldBypassRateLimit(mockRequest);
      expect(shouldBypass).toBe(true);
    });

    it('should bypass for trusted user agents', () => {
      const mockRequest = new Request('http://localhost:3000/test', {
        headers: {
          'user-agent': 'HealthCheck/1.0',
        },
      });

      const shouldBypass = shouldBypassRateLimit(mockRequest);
      expect(shouldBypass).toBe(true);
    });

    it('should not bypass for regular requests', () => {
      const mockRequest = new Request('http://localhost:3000/test', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0',
        },
      });

      const shouldBypass = shouldBypassRateLimit(mockRequest);
      expect(shouldBypass).toBe(false);
    });
  });

  describe('DynamicRateLimitAdjuster', () => {
    it('should not adjust rules when load is low', () => {
      const adjuster = new DynamicRateLimitAdjuster();
      adjuster.updateSystemLoad(0.5);

      const originalRules = [
        { id: 'test', name: 'test rule', strategy: 'sliding_window' as const, enabled: true, priority: 1, maxRequests: 100, windowSeconds: 60, scope: 'user' as const },
      ];

      const adjustedRules = adjuster.adjustRules(originalRules);
      expect(adjustedRules[0].maxRequests).toBe(100);
    });

    it('should reduce limits when load is high', () => {
      const adjuster = new DynamicRateLimitAdjuster();
      adjuster.updateSystemLoad(0.95);

      const originalRules = [
        { id: 'test', name: 'test rule', strategy: 'sliding_window' as const, enabled: true, priority: 1, maxRequests: 100, windowSeconds: 60, scope: 'user' as const },
      ];

      const adjustedRules = adjuster.adjustRules(originalRules);
      expect(adjustedRules[0].maxRequests).toBeLessThan(100);
    });
  });

  describe('Rate Limit Profiles', () => {
    it('should have all required profiles', () => {
      expect(rateLimitProfiles.standard).toBeDefined();
      expect(rateLimitProfiles.anonymous).toBeDefined();
      expect(rateLimitProfiles.professional).toBeDefined();
      expect(rateLimitProfiles.enterprise).toBeDefined();
      expect(rateLimitProfiles.security).toBeDefined();
    });

    it('should have escalating limits across tiers', () => {
      const anonymousLimit = rateLimitProfiles.anonymous.rules[0].maxRequests;
      const standardLimit = rateLimitProfiles.standard.rules[0].maxRequests;
      const premiumLimit = rateLimitProfiles.premium.rules[0].maxRequests;
      const enterpriseLimit = rateLimitProfiles.enterprise.rules[0].maxRequests;

      expect(standardLimit).toBeGreaterThan(anonymousLimit);
      expect(premiumLimit).toBeGreaterThan(standardLimit);
      expect(enterpriseLimit).toBeGreaterThan(premiumLimit);
    });

    it('should have restrictive security profile', () => {
      const securityLimit = rateLimitProfiles.security.rules[0].maxRequests;
      const anonymousLimit = rateLimitProfiles.anonymous.rules[0].maxRequests;

      expect(securityLimit).toBeLessThan(anonymousLimit);
    });
  });
});