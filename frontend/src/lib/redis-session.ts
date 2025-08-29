import crypto from 'crypto';

import { performanceMonitor } from './performance-monitoring';
import { getRedisClient } from './redis';

export interface SessionData {
  userId: string;
  enterpriseId?: string;
  role?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
}

export class RedisSessionStore {
  private client = getRedisClient();
  private prefix = 'session:';
  private defaultTTL = 86400; // 24 hours

  // Generate a cryptographically secure session ID
  generateSessionId(): string {
    // Use crypto.randomBytes for secure session ID generation
    // 32 bytes = 256 bits of entropy, which is very secure
    return crypto.randomBytes(32).toString('hex');
  }

  // Create a new session
  async create(
    userId: string,
    data: Partial<SessionData> = {},
    ttl?: number
  ): Promise<{ sessionId: string; session: SessionData }> {
    const measure = performanceMonitor.measureDatabaseQuery('session.create', 'redis');

    try {
      const sessionId = this.generateSessionId();
      const now = Date.now();
      const expiryTime = ttl || this.defaultTTL;

      const session: SessionData = {
        userId,
        ...data,
        createdAt: now,
        lastAccessedAt: now,
        expiresAt: now + (expiryTime * 1000),
      };

      const key = `${this.prefix}${sessionId}`;
      await this.client.setex(key, expiryTime, JSON.stringify(session));

      // Also store user's active sessions
      await this.addUserSession(userId, sessionId);

      measure.end({ success: true });
      return { sessionId, session };
    } catch (error) {
      console.error('Session create error:', error);
      measure.end({ success: false });
      throw error;
    }
  }

  // Get session by ID
  async get(sessionId: string): Promise<SessionData | null> {
    const measure = performanceMonitor.measureDatabaseQuery('session.get', 'redis');

    try {
      const key = `${this.prefix}${sessionId}`;
      const data = await this.client.get(key);

      if (!data) {
        measure.end({ success: true });
        return null;
      }

      const session = JSON.parse(data) as SessionData;

      // Check if session has expired
      if (session.expiresAt < Date.now()) {
        await this.destroy(sessionId);
        measure.end({ success: true });
        return null;
      }

      // Update last accessed time
      session.lastAccessedAt = Date.now();
      await this.update(sessionId, session);

      measure.end({ success: true });
      return session;
    } catch (error) {
      console.error('Session get error:', error);
      measure.end({ success: false });
      return null;
    }
  }

  // Update session data
  async update(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
    const measure = performanceMonitor.measureDatabaseQuery('session.update', 'redis');

    try {
      const existing = await this.get(sessionId);
      if (!existing) {
        measure.end({ success: false });
        return false;
      }

      const updated: SessionData = {
        ...existing,
        ...updates,
        lastAccessedAt: Date.now(),
      };

      const key = `${this.prefix}${sessionId}`;
      const ttl = Math.floor((updated.expiresAt - Date.now()) / 1000);
      
      if (ttl > 0) {
        await this.client.setex(key, ttl, JSON.stringify(updated));
        measure.end({ success: true });
        return true;
      }

      measure.end({ success: false });
      return false;
    } catch (error) {
      console.error('Session update error:', error);
      measure.end({ success: false });
      return false;
    }
  }

  // Extend session expiry
  async touch(sessionId: string, additionalTTL?: number): Promise<boolean> {
    const measure = performanceMonitor.measureDatabaseQuery('session.touch', 'redis');

    try {
      const session = await this.get(sessionId);
      if (!session) {
        measure.end({ success: false });
        return false;
      }

      const extension = additionalTTL || this.defaultTTL;
      session.expiresAt = Date.now() + (extension * 1000);
      
      const result = await this.update(sessionId, session);
      measure.end({ success: result });
      return result;
    } catch (error) {
      console.error('Session touch error:', error);
      measure.end({ success: false });
      return false;
    }
  }

  // Destroy a session
  async destroy(sessionId: string): Promise<boolean> {
    const measure = performanceMonitor.measureDatabaseQuery('session.destroy', 'redis');

    try {
      const session = await this.get(sessionId);
      if (session) {
        await this.removeUserSession(session.userId, sessionId);
      }

      const key = `${this.prefix}${sessionId}`;
      await this.client.del(key);
      
      measure.end({ success: true });
      return true;
    } catch (error) {
      console.error('Session destroy error:', error);
      measure.end({ success: false });
      return false;
    }
  }

  // Get all active sessions for a user
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const measure = performanceMonitor.measureDatabaseQuery('session.getUserSessions', 'redis');

    try {
      const key = `user_sessions:${userId}`;
      const sessionIds = await this.client.smembers(key);

      const sessions: SessionData[] = [];
      for (const sessionId of sessionIds) {
        const session = await this.get(sessionId);
        if (session) {
          sessions.push(session);
        } else {
          // Clean up invalid session reference
          await this.client.srem(key, sessionId);
        }
      }

      measure.end({ success: true, count: sessions.length });
      return sessions;
    } catch (error) {
      console.error('Get user sessions error:', error);
      measure.end({ success: false });
      return [];
    }
  }

  // Destroy all sessions for a user
  async destroyUserSessions(userId: string): Promise<number> {
    const measure = performanceMonitor.measureDatabaseQuery('session.destroyUserSessions', 'redis');

    try {
      const sessions = await this.getUserSessions(userId);
      let destroyed = 0;

      for (const session of sessions) {
        const sessionId = await this.findSessionId(session);
        if (sessionId && await this.destroy(sessionId)) {
          destroyed++;
        }
      }

      // Clean up user sessions set
      await this.client.del(`user_sessions:${userId}`);

      measure.end({ success: true, destroyed });
      return destroyed;
    } catch (error) {
      console.error('Destroy user sessions error:', error);
      measure.end({ success: false });
      return 0;
    }
  }

  // Clean up expired sessions
  async cleanup(): Promise<number> {
    const measure = performanceMonitor.measureDatabaseQuery('session.cleanup', 'redis');

    try {
      const pattern = `${this.prefix}*`;
      const keys = await this.client.keys(pattern);
      let cleaned = 0;

      for (const key of keys) {
        const data = await this.client.get(key);
        if (data) {
          try {
            const session = JSON.parse(data) as SessionData;
            if (session.expiresAt < Date.now()) {
              const sessionId = key.replace(this.prefix, '');
              await this.destroy(sessionId);
              cleaned++;
            }
          } catch (e) {
            // Invalid session data, remove it
            await this.client.del(key);
            cleaned++;
          }
        }
      }

      measure.end({ success: true, cleaned });
      return cleaned;
    } catch (error) {
      console.error('Session cleanup error:', error);
      measure.end({ success: false });
      return 0;
    }
  }

  // Private helper methods
  private async addUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `user_sessions:${userId}`;
    await this.client.sadd(key, sessionId);
    // Expire the set in 30 days (longer than session TTL to handle edge cases)
    await this.client.expire(key, 2592000);
  }

  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `user_sessions:${userId}`;
    await this.client.srem(key, sessionId);
  }

  private async findSessionId(session: SessionData): Promise<string | null> {
    // This is a helper method to find session ID from session data
    // In practice, you might want to store session ID within the session data
    const pattern = `${this.prefix}*`;
    const keys = await this.client.keys(pattern);

    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        try {
          const storedSession = JSON.parse(data) as SessionData;
          if (storedSession.userId === session.userId && 
              storedSession.createdAt === session.createdAt) {
            return key.replace(this.prefix, '');
          }
        } catch (e) {
          // Skip invalid session
        }
      }
    }

    return null;
  }
}

// Export singleton instance
export const sessionStore = new RedisSessionStore();

// Session middleware helper
export async function validateSession(sessionId: string): Promise<SessionData | null> {
  if (!sessionId) {
    return null;
  }

  const session = await sessionStore.get(sessionId);
  if (!session) {
    return null;
  }

  // Extend session on each valid request
  await sessionStore.touch(sessionId);

  return session;
}

// Create session from Supabase user
export async function createSessionFromSupabase(
  userId: string,
  userProfile: any
): Promise<{ sessionId: string; session: SessionData }> {
  const sessionData: Partial<SessionData> = {
    enterpriseId: userProfile?.enterprise_id,
    role: userProfile?.role,
    permissions: userProfile?.permissions,
    metadata: {
      email: userProfile?.email,
      firstName: userProfile?.first_name,
      lastName: userProfile?.last_name,
    },
  };

  return sessionStore.create(userId, sessionData);
}