import { test, expect } from 'vitest';
// @ts-ignore - drizzle-orm not installed
import { sql } from 'drizzle-orm';
import { db } from '../setup';

test('extensions should be enabled', async () => {
  const enabled_extensions = await db.execute(sql`SELECT name FROM pg_extension`);
  const extensions = enabled_extensions.rows.map((row: any) => row.name);
  expect(extensions).toContain('vector');
  expect(extensions).toContain('pg_net');
});
