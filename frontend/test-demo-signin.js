// Test demo user sign-in
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDemoSignIn() {
  console.log('=== Testing Demo User Sign-In ===\n');

  const email = 'demo@pactwise.com';
  const password = 'Demo123!';

  console.log('Step 1: Signing in...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message);
    process.exit(1);
  }

  console.log('✓ Sign in successful');
  console.log('  User ID:', signInData.user?.id);
  console.log('  Email:', signInData.user?.email);
  console.log('  Session expires:', signInData.session?.expires_at);

  // Step 2: Fetch profile
  console.log('\nStep 2: Fetching profile...');
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*, enterprises(name)')
    .eq('auth_id', signInData.user.id)
    .single();

  if (profileError) {
    console.error('❌ Profile fetch failed');
    console.error('  Error code:', profileError.code);
    console.error('  Error message:', profileError.message);
    console.error('  Error details:', profileError.details);
    console.error('  Error hint:', profileError.hint);
    process.exit(1);
  }

  console.log('✓ Profile fetched successfully');
  console.log('  Profile ID:', profile.id);
  console.log('  Email:', profile.email);
  console.log('  Name:', profile.first_name, profile.last_name);
  console.log('  Enterprise:', profile.enterprises?.name);
  console.log('  Enterprise ID:', profile.enterprise_id);
  console.log('  Role:', profile.role);

  console.log('\n✅ Demo user sign-in test passed!');
  console.log(`\n🔑 Demo credentials:\n  Email: ${email}\n  Password: ${password}`);

  process.exit(0);
}

testDemoSignIn().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
