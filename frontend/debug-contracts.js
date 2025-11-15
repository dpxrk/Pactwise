/**
 * Browser Console Debug Script for Contracts Issue
 *
 * Instructions:
 * 1. Open your browser
 * 2. Navigate to the dashboard (where contracts show correctly)
 * 3. Open DevTools Console (F12)
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter to run it
 * 6. Share the output with me
 */

(async function debugContracts() {
  console.log('=== Starting Contracts Debug ===\n');

  // Get supabase client from window (assuming it's available)
  const { createClient } = await import('/node_modules/@supabase/supabase-js/dist/main/index.js');

  const supabaseUrl = 'http://localhost:54321'; // Update if different
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 1. Get current user
  console.log('1. Getting current user...');
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('❌ Not authenticated:', userError?.message);
    return;
  }

  console.log('✅ User authenticated');
  console.log('   User ID (auth.uid):', user.id);
  console.log('   Email:', user.email);

  // 2. Get user profile
  console.log('\n2. Getting user profile from users table...');
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (profileError) {
    console.error('❌ Profile error:', profileError);
    return;
  }

  console.log('✅ User profile found');
  console.log('   Profile ID:', profile.id);
  console.log('   Enterprise ID:', profile.enterprise_id);
  console.log('   Role:', profile.role);

  // 3. Test current_user_enterprise_id() function
  console.log('\n3. Testing current_user_enterprise_id() RLS helper...');
  const { data: enterpriseIdResult, error: enterpriseIdError } = await supabase
    .rpc('current_user_enterprise_id');

  if (enterpriseIdError) {
    console.error('❌ RLS helper error:', enterpriseIdError);
  } else {
    console.log('✅ RLS helper result:', enterpriseIdResult);
    if (enterpriseIdResult !== profile.enterprise_id) {
      console.warn('⚠️  MISMATCH: RLS helper returns different enterprise_id!');
    }
  }

  // 4. Test get_dashboard_stats RPC (should work)
  console.log('\n4. Testing get_dashboard_stats RPC (bypasses RLS)...');
  const { data: statsData, error: statsError } = await supabase
    .rpc('get_dashboard_stats', { p_enterprise_id: profile.enterprise_id });

  if (statsError) {
    console.error('❌ RPC Error:', statsError);
  } else {
    console.log('✅ RPC Response:');
    console.log('   Total Contracts:', statsData.contracts.total);
    console.log('   Active Contracts:', statsData.contracts.byStatus.active);
    console.log('   Full contract stats:', statsData.contracts);
  }

  // 5. Test direct query (subject to RLS)
  console.log('\n5. Testing direct query (subject to RLS)...');
  const { data: contracts, error: contractsError, count } = await supabase
    .from('contracts')
    .select('*', { count: 'exact' })
    .eq('enterprise_id', profile.enterprise_id);

  if (contractsError) {
    console.error('❌ Direct Query Error:', contractsError);
    console.error('   Code:', contractsError.code);
    console.error('   Message:', contractsError.message);
    console.error('   Details:', contractsError.details);
    console.error('   Hint:', contractsError.hint);
  } else {
    console.log('✅ Direct Query Success:');
    console.log('   Count:', count);
    console.log('   Returned rows:', contracts?.length || 0);
    if (contracts && contracts.length > 0) {
      console.log('   First contract:', contracts[0]);
    } else {
      console.warn('⚠️  No contracts returned! This is the issue.');
    }
  }

  // 6. Test query with vendor join (as used in contracts page)
  console.log('\n6. Testing query with vendor join...');
  const { data: contractsWithVendor, error: vendorError, count: vendorCount } = await supabase
    .from('contracts')
    .select('*, vendor:vendors(*)', { count: 'exact' })
    .eq('enterprise_id', profile.enterprise_id)
    .range(0, 19);

  if (vendorError) {
    console.error('❌ Vendor Join Error:', vendorError);
    console.error('   Code:', vendorError.code);
    console.error('   Message:', vendorError.message);
  } else {
    console.log('✅ Vendor Join Success:');
    console.log('   Count:', vendorCount);
    console.log('   Returned rows:', contractsWithVendor?.length || 0);
    if (contractsWithVendor && contractsWithVendor.length > 0) {
      console.log('   First contract:', contractsWithVendor[0]);
    }
  }

  // 7. Test RLS policy directly with explain
  console.log('\n7. Checking RLS policy application...');
  console.log('   Note: RLS policies are enforced at database level');
  console.log('   The policy requires: enterprise_id = current_user_enterprise_id() AND deleted_at IS NULL');

  // 8. Summary
  console.log('\n=== SUMMARY ===');
  const rlsWorks = !!contracts && contracts.length > 0;
  const rpcWorks = !!statsData && statsData.contracts.total > 0;

  if (rpcWorks && !rlsWorks) {
    console.error('❌ ISSUE CONFIRMED:');
    console.error('   - RPC function returns contracts:', statsData.contracts.total);
    console.error('   - Direct query returns:', contracts?.length || 0);
    console.error('   - This indicates an RLS policy issue');
    console.log('\nPOSSIBLE CAUSES:');
    console.log('   1. The current_user_enterprise_id() function is not returning the correct value');
    console.log('   2. The RLS policy is not properly configured');
    console.log('   3. The JWT token does not have the correct claims');
  } else if (!rpcWorks && !rlsWorks) {
    console.warn('⚠️  No contracts found in either query');
    console.log('   This might mean there are no contracts in the database');
  } else {
    console.log('✅ Everything appears to be working correctly');
  }

  console.log('\n=== Debug Complete ===');
})();
