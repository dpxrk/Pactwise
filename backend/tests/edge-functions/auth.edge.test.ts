import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// import { createClient } from '@supabase/supabase-js';
import { createTestUser, createTestEnterprise, cleanupTestData } from '../setup';

const FUNCTION_URL = 'http://localhost:54321/functions/v1';

describe('Auth Edge Function', () => {
  // let supabase: ReturnType<typeof createClient>;
  let testEnterprise: { id: string; name: string };
  let adminUser: { id: string; email: string; authToken: string };

  beforeEach(async () => {
    // supabase = createClient(
    //   process.env.SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_ROLE_KEY!
    // );

    testEnterprise = await createTestEnterprise();
    adminUser = await createTestUser(testEnterprise.id, 'admin');
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should get user with valid token', async () => {
    const response = await fetch(`${FUNCTION_URL}/auth` , {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminUser.authToken}`,
      },
      body: JSON.stringify({ action: 'GET_USER' }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.id).toBe(adminUser.id);
    expect(data.email).toBe(adminUser.email);
  });
});
