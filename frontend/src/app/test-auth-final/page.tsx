'use client';

import { useState } from 'react';

export default function TestAuthFinal() {
  const [results, setResults] = useState<string[]>([]);
  
  const runTests = async () => {
    const log = (msg: string) => {
      setResults(prev => [...prev, msg]);
      console.log(msg);
    };
    
    setResults([]);
    
    // Check current location
    log(`🌐 Current URL: ${window.location.href}`);
    log(`   Protocol: ${window.location.protocol}`);
    log(`   Host: ${window.location.host}`);
    
    // Check environment
    log(`\n📋 Environment:`);
    log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}`);
    
    // Test both localhost and 127.0.0.1
    log(`\n🔍 Testing connections:`);
    
    // Test 1: localhost
    try {
      const r1 = await fetch('http://localhost:54321/auth/v1/health');
      log(`   ✅ http://localhost:54321 - Status: ${r1.status}`);
    } catch (e: any) {
      log(`   ❌ http://localhost:54321 - Error: ${e.message}`);
    }
    
    // Test 2: 127.0.0.1
    try {
      const r2 = await fetch('http://127.0.0.1:54321/auth/v1/health');
      log(`   ✅ http://127.0.0.1:54321 - Status: ${r2.status}`);
    } catch (e: any) {
      log(`   ❌ http://127.0.0.1:54321 - Error: ${e.message}`);
    }
    
    // Test 3: With Supabase client using 127.0.0.1
    log(`\n🔐 Testing Supabase client with 127.0.0.1:`);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(
        'http://127.0.0.1:54321',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      );
      
      const { data, error } = await client.auth.signInWithPassword({
        email: 'demo@pactwise.com',
        password: 'Demo123!'
      });
      
      if (error) {
        log(`   ❌ Auth failed: ${error.message}`);
      } else {
        log(`   ✅ Auth successful! User: ${data.user?.email}`);
      }
    } catch (e: any) {
      log(`   ❌ Client error: ${e.message}`);
    }
    
    // Check for mixed content
    if (window.location.protocol === 'https:') {
      log(`\n⚠️ WARNING: You're on HTTPS but trying to connect to HTTP!`);
      log(`   Browsers block mixed content (HTTPS → HTTP)`);
      log(`   Solution: Access the site via http://localhost:3000`);
    }
  };
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Final Auth Test</h1>
      
      <button
        onClick={runTests}
        className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
      >
        Run All Tests
      </button>
      
      <div className="bg-gray-100 p-4 rounded">
        <pre className="whitespace-pre-wrap text-sm">
          {results.length === 0 ? 'Click "Run All Tests" to start...' : results.join('\n')}
        </pre>
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded">
        <h3 className="font-bold mb-2">⚠️ Important:</h3>
        <ul className="list-disc ml-4 space-y-1">
          <li>Make sure you access the site via <strong>http://</strong>localhost:3000</li>
          <li>NOT https:// (HTTPS will block HTTP requests)</li>
          <li>Check browser console for detailed errors</li>
        </ul>
      </div>
    </div>
  );
}