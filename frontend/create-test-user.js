// Create a test user with known credentials
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTestUser() {
  const email = 'testuser@pactwise.com';
  const password = 'TestPassword123!';

  console.log('Creating test user with email:', email);

  // Sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Test User'
      }
    }
  });

  if (error) {
    console.error('Error:', error.message);
    // Try to sign in if user already exists
    console.log('\nUser might already exist, trying to sign in...');

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('Sign in also failed:', signInError.message);
      process.exit(1);
    }

    console.log('✓ Successfully signed in with existing user');
    console.log('User ID:', signInData.user.id);
  } else {
    console.log('✓ User created successfully');
    console.log('User ID:', data.user?.id);
  }

  console.log(`\n✅ Test user ready!\n\nCredentials:\n  Email: ${email}\n  Password: ${password}`);

  process.exit(0);
}

createTestUser().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
