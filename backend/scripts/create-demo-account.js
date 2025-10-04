/**
 * Create Demo Account Script
 *
 * This script creates a demo account with credentials:
 * Email: demo@pactwise.com
 * Password: Demo123!@#
 *
 * Run with: node scripts/create-demo-account.js
 */

const https = require('http');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function createDemoAccount() {
  console.log('🚀 Creating demo account...');

  const data = JSON.stringify({
    email: 'demo@pactwise.com',
    password: 'Demo123!@#',
    email_confirm: true,
    user_metadata: {
      full_name: 'Demo User'
    }
  });

  const options = {
    hostname: '127.0.0.1',
    port: 54321,
    path: '/auth/v1/admin/users',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);

          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ Auth user created:', response.email);
            console.log('📧 Email:', response.email);
            console.log('🔑 User ID:', response.id);
            resolve(true);
          } else if (response.msg && response.msg.includes('already registered')) {
            console.log('ℹ️  Demo user already exists');
            resolve(true);
          } else {
            console.error('❌ Error creating auth user:', response);
            resolve(false);
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          console.error('Response body:', body);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run the function
createDemoAccount()
  .then(success => {
    if (success) {
      console.log('\n✅ Demo account creation complete!');
      console.log('\n📝 Next steps:');
      console.log('   1. Sign in at http://localhost:3000/auth/sign-in');
      console.log('   2. Email: demo@pactwise.com');
      console.log('   3. Password: Demo123!@#');
      console.log('\n   After first login, run: bash scripts/create-demo-user.sh');
      console.log('   This will add the seed data to your account.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
