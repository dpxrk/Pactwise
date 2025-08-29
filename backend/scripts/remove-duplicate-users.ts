#!/usr/bin/env node

/**
 * Script to identify and remove duplicate user accounts
 * Usage: npm run remove-duplicates [--dry-run] [--hard-delete]
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import readline from 'readline';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

interface DuplicateUser {
  email: string;
  user_id: string;
  auth_id: string;
  enterprise_id: string;
  enterprise_name: string;
  created_at: string;
  last_login_at: string | null;
  duplicate_count: number;
  rank: number;
}

async function findDuplicates(): Promise<DuplicateUser[]> {
  const { data, error } = await supabase.rpc('find_duplicate_users');
  
  if (error) {
    // If function doesn't exist, use direct query
    const query = `
      WITH duplicate_users AS (
        SELECT 
          u.email,
          u.id as user_id,
          u.auth_id,
          u.enterprise_id,
          u.created_at,
          u.last_login_at,
          e.name as enterprise_name,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(u.email), u.enterprise_id 
            ORDER BY u.created_at DESC, u.last_login_at DESC NULLS LAST
          ) as rank,
          COUNT(*) OVER (PARTITION BY LOWER(u.email), u.enterprise_id) as duplicate_count
        FROM users u
        JOIN enterprises e ON u.enterprise_id = e.id
        WHERE u.deleted_at IS NULL
      )
      SELECT * FROM duplicate_users
      WHERE duplicate_count > 1
      ORDER BY email, enterprise_name, rank;
    `;
    
    const { data: queryData, error: queryError } = await supabase
      .from('users')
      .select(query);
    
    if (queryError) {
      throw new Error(`Failed to find duplicates: ${queryError.message}`);
    }
    
    return queryData as DuplicateUser[];
  }
  
  return data as DuplicateUser[];
}

async function softDeleteDuplicates(duplicatesToRemove: DuplicateUser[]): Promise<void> {
  const userIds = duplicatesToRemove.map(u => u.user_id);
  
  const { error } = await supabase
    .from('users')
    .update({ 
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .in('id', userIds);
  
  if (error) {
    throw new Error(`Failed to soft delete users: ${error.message}`);
  }
  
  console.log(`✅ Soft-deleted ${userIds.length} duplicate users`);
}

async function hardDeleteDuplicates(duplicatesToRemove: DuplicateUser[]): Promise<void> {
  const userIds = duplicatesToRemove.map(u => u.user_id);
  const authIds = duplicatesToRemove.map(u => u.auth_id);
  
  // Delete from users table
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .in('id', userIds);
  
  if (userError) {
    throw new Error(`Failed to delete users: ${userError.message}`);
  }
  
  // Delete from auth.users
  for (const authId of authIds) {
    const { error: authError } = await supabase.auth.admin.deleteUser(authId);
    if (authError) {
      console.warn(`⚠️  Failed to delete auth user ${authId}: ${authError.message}`);
    }
  }
  
  console.log(`✅ Hard-deleted ${userIds.length} duplicate users`);
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isHardDelete = args.includes('--hard-delete');
  
  console.log('🔍 Searching for duplicate user accounts...\n');
  
  try {
    const duplicates = await findDuplicates();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate users found!');
      process.exit(0);
    }
    
    // Group duplicates by email and enterprise
    const grouped = duplicates.reduce((acc, user) => {
      const key = `${user.email}-${user.enterprise_id}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(user);
      return acc;
    }, {} as Record<string, DuplicateUser[]>);
    
    console.log(`Found ${Object.keys(grouped).length} groups of duplicate users:\n`);
    
    // Display duplicates
    Object.entries(grouped).forEach(([key, users]) => {
      console.log(`📧 Email: ${users[0].email} | Enterprise: ${users[0].enterprise_name}`);
      users.forEach(user => {
        const action = user.rank === 1 ? '✅ KEEP' : '❌ REMOVE';
        const loginInfo = user.last_login_at ? ` | Last login: ${new Date(user.last_login_at).toLocaleDateString()}` : ' | Never logged in';
        console.log(`  ${action} - ID: ${user.user_id} | Created: ${new Date(user.created_at).toLocaleDateString()}${loginInfo}`);
      });
      console.log('');
    });
    
    // Get users to remove (rank > 1)
    const toRemove = duplicates.filter(u => u.rank > 1);
    
    if (isDryRun) {
      console.log(`\n🔵 DRY RUN: Would remove ${toRemove.length} duplicate users`);
      console.log('Run without --dry-run to actually remove duplicates');
      process.exit(0);
    }
    
    // Confirm action
    const deleteType = isHardDelete ? 'PERMANENTLY DELETE' : 'soft-delete';
    const answer = await question(
      `\n⚠️  Are you sure you want to ${deleteType} ${toRemove.length} duplicate users? (yes/no): `
    );
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }
    
    // Perform deletion
    if (isHardDelete) {
      await hardDeleteDuplicates(toRemove);
    } else {
      await softDeleteDuplicates(toRemove);
    }
    
    console.log('\n✨ Duplicate removal completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();