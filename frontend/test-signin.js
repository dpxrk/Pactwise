// Test sign-in flow
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignIn() {
  console.log('=== Testing Sign-In Flow ===\n');

  // Step 1: Create a test user
  console.log('Step 1: Creating test user...');
  const testEmail = `test${Date.now()}@test.com`;
  const testPassword = 'TestPassword123!';

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Test User'
      }
    }
  });

  if (signUpError) {
    console.error('❌ Sign up failed:', signUpError.message);
    process.exit(1);
  }

  console.log('✓ Sign up successful');
  console.log('  User ID:', signUpData.user?.id);
  console.log('  Email:', signUpData.user?.email);

  // Step 2: Try to fetch profile (should trigger setup_new_user)
  console.log('\nStep 2: Fetching user profile (should auto-create)...');

  // Wait a bit for any async operations
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', signUpData.user.id)
    .single();

  if (profileError) {
    console.log('  Profile not found, checking error code:', profileError.code);

    if (profileError.code === 'PGRST116') {
      console.log('  Profile doesn\'t exist, calling setup_new_user...');

      const { data: setupData, error: setupError } = await supabase.rpc('setup_new_user', {
        p_auth_id: signUpData.user.id,
        p_email: signUpData.user.email,
        p_first_name: 'Test',
        p_last_name: 'User',
        p_metadata: { source: 'test' }
      });

      if (setupError) {
        console.error('❌ setup_new_user failed:', setupError);
        process.exit(1);
      }

      console.log('✓ User setup successful:', setupData);

      // Try fetching profile again
      const { data: newProfile, error: newProfileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', signUpData.user.id)
        .single();

      if (newProfileError) {
        console.error('❌ Still cannot fetch profile:', newProfileError);
        process.exit(1);
      }

      console.log('✓ Profile fetched successfully after setup');
      console.log('  Profile:', newProfile);
    } else {
      console.error('❌ Unexpected error:', profileError);
      process.exit(1);
    }
  } else {
    console.log('✓ Profile fetched successfully');
    console.log('  Profile:', profileData);
  }

  // Step 3: Sign out and sign back in
  console.log('\nStep 3: Signing out...');
  await supabase.auth.signOut();
  console.log('✓ Signed out');

  console.log('\nStep 4: Signing back in...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message);
    process.exit(1);
  }

  console.log('✓ Sign in successful');
  console.log('  User ID:', signInData.user?.id);

  // Step 5: Fetch profile after sign in
  console.log('\nStep 5: Fetching profile after sign in...');
  const { data: finalProfile, error: finalProfileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', signInData.user.id)
    .single();

  if (finalProfileError) {
    console.error('❌ Profile fetch failed:', finalProfileError);
    process.exit(1);
  }

  console.log('✓ Profile fetched successfully');
  console.log('  Profile:', {
    id: finalProfile.id,
    email: finalProfile.email,
    first_name: finalProfile.first_name,
    last_name: finalProfile.last_name,
    enterprise_id: finalProfile.enterprise_id,
    role: finalProfile.role
  });

  console.log('\n✅ All tests passed!');
  console.log(`\n🔑 Test credentials:\n  Email: ${testEmail}\n  Password: ${testPassword}`);

  process.exit(0);
}

testSignIn().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
