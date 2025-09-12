'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-debug'

export default function TestSupabase() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult('Testing...')
    
    try {
      // Test 1: Direct fetch to health endpoint
      console.log('Test 1: Direct fetch to health endpoint')
      const healthUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'}/auth/v1/health`
      console.log('Health URL:', healthUrl)
      
      const healthResponse = await fetch(healthUrl)
      const healthData = await healthResponse.json()
      console.log('Health response:', healthData)
      setResult(prev => prev + '\n✓ Health check passed: ' + JSON.stringify(healthData))
      
      // Test 2: Supabase auth getSession
      console.log('Test 2: Supabase auth getSession')
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Session error:', sessionError)
        setResult(prev => prev + '\n✗ Session error: ' + sessionError.message)
      } else {
        console.log('Session:', session)
        setResult(prev => prev + '\n✓ Session check passed')
      }
      
      // Test 3: Database query
      console.log('Test 3: Database query')
      const { data, error: dbError } = await supabase
        .from('enterprises')
        .select('id')
        .limit(1)
      
      if (dbError) {
        console.error('Database error:', dbError)
        setResult(prev => prev + '\n✗ Database error: ' + dbError.message)
      } else {
        console.log('Database query result:', data)
        setResult(prev => prev + '\n✓ Database query passed')
      }
      
      // Test 4: Try sign in with invalid credentials (should get proper error)
      console.log('Test 4: Sign in test')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
      
      if (signInError) {
        console.log('Sign in error (expected):', signInError.message)
        setResult(prev => prev + '\n✓ Sign in test passed (got expected error): ' + signInError.message)
      }
      
    } catch (error) {
      console.error('Test failed:', error)
      setResult(prev => prev + '\n\n❌ Error: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p className="font-semibold">Configuration:</p>
        <p className="font-mono text-sm">
          URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'}
        </p>
        <p className="font-mono text-sm">
          Key: {(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').substring(0, 20)}...
        </p>
      </div>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>
      
      {result && (
        <pre className="mt-4 p-4 bg-gray-900 text-green-400 rounded overflow-x-auto">
          {result}
        </pre>
      )}
      
      <div className="mt-4">
        <p className="text-sm text-gray-600">Open browser console for detailed logs</p>
      </div>
    </div>
  )
}