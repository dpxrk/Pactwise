import { describe, it, expect, vi } from 'vitest';
import { SecurityMonitor, logSecurityEvent, securityEventMiddleware } from '@functions/_shared/security-monitoring';

// Mock the Supabase client
vi.mock('@functions/_shared/supabase', () => ({
  createAdminClient: () => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-event-id' },
            error: null,
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-user-id', email: 'test@example.com' },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

describe('Security Monitoring', () => {
  describe('SecurityMonitor', () => {
    it('should create a security monitor instance', () => {
      const monitor = new SecurityMonitor();
      expect(monitor).toBeInstanceOf(SecurityMonitor);
    });

    it('should log security events', async () => {
      const monitor = new SecurityMonitor();

      const eventId = await monitor.logSecurityEvent({
        event_type: 'auth_failure',
        severity: 'medium',
        title: 'Failed Login Attempt',
        description: 'Invalid credentials provided',
        source_ip: '192.168.1.100',
        metadata: { attempts: 3 },
      });

      expect(eventId).toBe('test-event-id');
    });
  });

  describe('logSecurityEvent convenience function', () => {
    it('should log security event using convenience function', async () => {
      const eventId = await logSecurityEvent({
        event_type: 'rate_limit_violation',
        severity: 'high',
        title: 'Rate Limit Exceeded',
        description: 'Too many requests from IP',
        source_ip: '192.168.1.100',
        metadata: { requests: 100 },
      });

      expect(eventId).toBe('test-event-id');
    });
  });

  describe('securityEventMiddleware', () => {
    it('should create middleware function', () => {
      const mockRequest = new Request('http://localhost:3000/test', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0',
        },
      });

      const middleware = securityEventMiddleware(mockRequest, 'suspicious_activity', 'medium');
      expect(typeof middleware).toBe('function');
    });

    it('should log security event when middleware is called with error', async () => {
      const mockRequest = new Request('http://localhost:3000/test', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0',
        },
      });

      const middleware = securityEventMiddleware(mockRequest, 'malicious_payload', 'high');
      const error = new Error('SQL injection detected');

      await expect(middleware(error)).resolves.not.toThrow();
    });
  });

  describe('Security Event Types', () => {
    const validEventTypes = [
      'auth_failure',
      'rate_limit_violation',
      'suspicious_activity',
      'data_breach_attempt',
      'privilege_escalation',
      'unauthorized_access',
      'malicious_payload',
      'brute_force_attack',
      'anomalous_behavior',
      'system_intrusion',
    ];

    it('should accept all valid security event types', async () => {
      const monitor = new SecurityMonitor();

      for (const eventType of validEventTypes) {
        await expect(monitor.logSecurityEvent({
          event_type: eventType as unknown,
          severity: 'medium',
          title: `Test ${eventType}`,
          description: `Test event for ${eventType}`,
          source_ip: '192.168.1.100',
          metadata: {},
        })).resolves.toBe('test-event-id');
      }
    });
  });

  describe('Security Severity Levels', () => {
    const validSeverityLevels = ['low', 'medium', 'high', 'critical'];

    it('should accept all valid severity levels', async () => {
      const monitor = new SecurityMonitor();

      for (const severity of validSeverityLevels) {
        await expect(monitor.logSecurityEvent({
          event_type: 'suspicious_activity',
          severity: severity as unknown,
          title: `Test ${severity} event`,
          description: `Test event with ${severity} severity`,
          source_ip: '192.168.1.100',
          metadata: {},
        })).resolves.toBe('test-event-id');
      }
    });
  });
});