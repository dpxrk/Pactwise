'use client';

import { useState, useEffect } from 'react';

export default function FixAuthPage() {
  const [status, setStatus] = useState<string[]>([]);
  const [fixed, setFixed] = useState(false);

  const addStatus = (message: string) => {
    setStatus(prev => [...prev, message]);
  };

  const fixAuth = async () => {
    setStatus([]);
    
    // 1. Unregister all service workers
    addStatus('🔧 Unregistering service workers...');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const success = await registration.unregister();
        addStatus(`   - Unregistered: ${registration.scope} (${success ? '✅' : '❌'})`);
      }
      
      if (registrations.length === 0) {
        addStatus('   - No service workers found');
      }
    } else {
      addStatus('   - Service workers not supported');
    }

    // 2. Clear all caches
    addStatus('\n🗑️ Clearing caches...');
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const deleted = await caches.delete(name);
        addStatus(`   - Deleted cache: ${name} (${deleted ? '✅' : '❌'})`);
      }
      
      if (cacheNames.length === 0) {
        addStatus('   - No caches found');
      }
    }

    // 3. Clear localStorage and sessionStorage
    addStatus('\n🧹 Clearing storage...');
    try {
      localStorage.clear();
      addStatus('   - localStorage cleared ✅');
    } catch (e) {
      addStatus('   - localStorage clear failed ❌');
    }
    
    try {
      sessionStorage.clear();
      addStatus('   - sessionStorage cleared ✅');
    } catch (e) {
      addStatus('   - sessionStorage clear failed ❌');
    }

    // 4. Test connection to Supabase
    addStatus('\n🔍 Testing Supabase connection...');
    try {
      const response = await fetch('http://localhost:54321/auth/v1/health', {
        cache: 'no-store',
        mode: 'cors',
      });
      addStatus(`   - Connection test: ${response.status} ${response.statusText} ✅`);
    } catch (error: any) {
      addStatus(`   - Connection test failed: ${error.message} ❌`);
    }

    // 5. Environment check
    addStatus('\n📋 Environment check...');
    addStatus(`   - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}`);
    addStatus(`   - Has Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'YES' : 'NO'}`);
    addStatus(`   - Node Env: ${process.env.NODE_ENV}`);

    setFixed(true);
    addStatus('\n✨ Cleanup complete! Please reload the page to apply changes.');
  };

  useEffect(() => {
    // Auto-run on mount
    fixAuth();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔧 Auth Fix Utility</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
        <p className="font-semibold mb-2">This page will:</p>
        <ul className="list-disc ml-6">
          <li>Unregister all service workers</li>
          <li>Clear all browser caches</li>
          <li>Clear localStorage and sessionStorage</li>
          <li>Test the connection to Supabase</li>
        </ul>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <pre className="whitespace-pre-wrap text-sm font-mono">
          {status.join('\n') || 'Starting...'}
        </pre>
      </div>

      {fixed && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <h3 className="font-bold text-lg mb-2">✅ Next Steps:</h3>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Click here to reload the page
                </button>
              </li>
              <li>Navigate to <a href="/auth/sign-in" className="text-blue-600 underline">/auth/sign-in</a></li>
              <li>Try signing in with:
                <ul className="list-disc ml-6 mt-1">
                  <li>Email: demo@pactwise.com</li>
                  <li>Password: Demo123!</li>
                </ul>
              </li>
            </ol>
          </div>
          
          <button
            onClick={fixAuth}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Run Again
          </button>
        </div>
      )}
    </div>
  );
}