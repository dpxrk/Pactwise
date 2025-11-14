// Create demo user and get IDs
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createDemoUser() {
  const email = 'demo@pactwise.app';
  const password = 'demo1234';

  console.log('Creating demo user:', email);

  // Sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Demo User',
        first_name: 'Demo',
        last_name: 'User'
      }
    }
  });

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('✓ User created successfully');
  console.log('User ID:', data.user?.id);
  console.log('Email:', data.user?.email);

  // Wait a bit for profile to be created
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Fetch the profile to get enterprise_id
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, enterprise_id')
    .eq('auth_id', data.user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError.message);
    console.error('  The user was created but profile setup may have failed.');
    console.error('  Try signing in at http://localhost:3000/auth/sign-in to complete setup.');
  } else {
    console.log('\n✓ Profile found');
    console.log('Profile ID:', profile.id);
    console.log('Enterprise ID:', profile.enterprise_id);
  }

  console.log(`\n✅ Demo user ready!\n\nCredentials:\n  Email: ${email}\n  Password: ${password}`);
  console.log('\n📝 Copy these IDs to your seed script:');
  console.log(`  ENTERPRISE_ID = '${profile?.enterprise_id || 'PENDING - sign in first'}';`);
  console.log(`  DEMO_USER_ID = '${profile?.id || 'PENDING - sign in first'}';`);

  process.exit(0);
}

createDemoUser().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
