// Run this with: node diagnose-auth.js
// This tests the auth connection from Node.js perspective

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  // Test 1: Basic connection
  console.log('1. Testing basic connection...');
  try {
    const { data, error } = await supabase.from('enterprises').select('count').limit(1);
    if (error) {
      console.error('   ❌ Connection failed:', error.message);
    } else {
      console.log('   ✓ Connection successful');
    }
  } catch (err) {
    console.error('   ❌ Exception:', err.message);
  }

  // Test 2: Try to sign in with demo account
  console.log('\n2. Testing sign in with demo@pactwise.com...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'demo@pactwise.com',
      password: 'demo123'
    });

    if (error) {
      console.error('   ❌ Sign in failed:', error.message);
      return;
    } else {
      console.log('   ✓ Sign in successful');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
    }

    // Test 3: Try to fetch user profile
    console.log('\n3. Testing user profile fetch...');
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', data.user.id)
      .single();

    if (profileError) {
      console.error('   ❌ Profile fetch failed');
      console.error('   Error code:', profileError.code);
      console.error('   Error message:', profileError.message);
      console.error('   Error details:', profileError.details);
      console.error('   Error hint:', profileError.hint);
      console.error('   Full error:', JSON.stringify(profileError, null, 2));
    } else {
      console.log('   ✓ Profile fetch successful');
      console.log('   Profile:', {
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        enterprise_id: profile.enterprise_id,
        role: profile.role
      });
    }

    // Test 4: Try calling setup_new_user RPC
    console.log('\n4. Testing setup_new_user RPC (should say user exists)...');
    const { data: setupData, error: setupError } = await supabase.rpc('setup_new_user', {
      p_auth_id: data.user.id,
      p_email: data.user.email,
      p_first_name: 'Test',
      p_last_name: 'User'
    });

    if (setupError) {
      console.error('   ❌ RPC call failed:', setupError.message);
    } else {
      console.log('   ✓ RPC call successful');
      console.log('   Result:', setupData);
    }

  } catch (err) {
    console.error('   ❌ Exception:', err.message, err.stack);
  }

  console.log('\n✅ Diagnostic complete');
  process.exit(0);
}

testConnection();
