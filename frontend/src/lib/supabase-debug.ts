import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Log configuration for debugging
console.log('🔧 Supabase Configuration:')
console.log('  URL:', supabaseUrl)
console.log('  Key:', supabaseAnonKey.substring(0, 20) + '...')
console.log('  Environment:', process.env.NODE_ENV)

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit' // Changed from 'pkce' to 'implicit' for local development
  },
  global: {
    headers: {
      'X-Client-Info': 'pactwise-frontend'
    }
  }
})

// Test function to debug connection
export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...')
  
  try {
    // Test 1: Simple health check
    const response = await fetch(`${supabaseUrl}/auth/v1/health`)
    console.log('  Health check response:', response.status, response.statusText)
    
    if (response.ok) {
      const data = await response.json()
      console.log('  Auth service:', data)
    }
    
    // Test 2: Try to get session
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.log('  Session error:', sessionError)
    } else {
      console.log('  Session:', session ? 'Active' : 'None')
    }
    
    // Test 3: Database query
    const { error: dbError } = await supabase.from('enterprises').select('count').limit(1)
    if (dbError) {
      console.log('  Database error:', dbError)
    } else {
      console.log('  Database: Connected')
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error)
  }
}

// Run test automatically in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  testSupabaseConnection()
}