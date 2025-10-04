/**
 * Create Demo Account Script
 *
 * This script creates a demo account with credentials:
 * Email: demo@pactwise.com
 * Password: Demo123!@#
 *
 * Run with: deno run --allow-net --allow-env create-demo-account.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createDemoAccount() {
  console.log('🚀 Creating demo account...')

  // Create user with Auth Admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'demo@pactwise.com',
    password: 'Demo123!@#',
    email_confirm: true,
    user_metadata: {
      full_name: 'Demo User'
    }
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('ℹ️  Demo user already exists')
      return true
    }
    console.error('❌ Error creating auth user:', authError)
    return false
  }

  console.log('✅ Auth user created:', authData.user?.email)
  console.log('📧 Email:', authData.user?.email)
  console.log('🔑 User ID:', authData.user?.id)

  return true
}

// Run the function
createDemoAccount()
  .then(success => {
    if (success) {
      console.log('\n✅ Demo account creation complete!')
      console.log('\n📝 Next steps:')
      console.log('   1. Sign in at http://localhost:3000/auth/sign-in')
      console.log('   2. Email: demo@pactwise.com')
      console.log('   3. Password: Demo123!@#')
      console.log('\n   After first login, run: bash scripts/create-demo-user.sh')
      console.log('   This will add the seed data to your account.')
    }
    Deno.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    Deno.exit(1)
  })
