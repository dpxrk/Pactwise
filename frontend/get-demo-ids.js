// Sign in and get demo user IDs
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getDemoIDs() {
  const email = 'demo@pactwise.app';
  const password = 'demo1234';

  console.log('Signing in as:', email);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error('Sign in error:', authError.message);
    process.exit(1);
  }

  console.log('✓ Signed in successfully');
  console.log('Auth User ID:', authData.user.id);

  // Wait for profile to be created
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, enterprise_id, email')
    .eq('auth_id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('Profile error:', profileError?.message || 'No profile found');
    console.log('\n⚠️  Profile not created yet. Triggering manual profile creation...');

    // Try to manually trigger profile creation via RPC
    const { data: setupData, error: setupError } = await supabase
      .rpc('setup_new_user', {
        p_auth_id: authData.user.id,
        p_email: email,
        p_first_name: 'Demo',
        p_last_name: 'User'
      });

    if (setupError) {
      console.error('Setup error:', setupError.message);
    } else {
      console.log('✓ Profile setup triggered');

      // Try fetching profile again
      const { data: profile2, error: profileError2 } = await supabase
        .from('users')
        .select('id, enterprise_id, email')
        .eq('auth_id', authData.user.id)
        .single();

      if (profile2) {
        console.log('\n✅ Profile found!');
        console.log('Profile ID:', profile2.id);
        console.log('Enterprise ID:', profile2.enterprise_id);
        console.log('\n📝 Copy these to your seed script:');
        console.log(`const ENTERPRISE_ID = '${profile2.enterprise_id}';`);
        console.log(`const DEMO_USER_ID = '${profile2.id}';`);
        process.exit(0);
      } else {
        console.error('Profile still not found:', profileError2?.message);
      }
    }
  } else {
    console.log('\n✅ Profile found!');
    console.log('Profile ID:', profile.id);
    console.log('Enterprise ID:', profile.enterprise_id);
    console.log('\n📝 Copy these to your seed script:');
    console.log(`const ENTERPRISE_ID = '${profile.enterprise_id}';`);
    console.log(`const DEMO_USER_ID = '${profile.id}';`);
    process.exit(0);
  }

  process.exit(1);
}

getDemoIDs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
