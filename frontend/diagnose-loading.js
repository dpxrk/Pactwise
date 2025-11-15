/**
 * Browser Console Diagnostic for Dashboard Loading Issue
 *
 * Instructions:
 * 1. Navigate to http://localhost:3000/dashboard
 * 2. Open Browser DevTools (F12)
 * 3. Go to Console tab
 * 4. Paste this entire script and press Enter
 */

(async function diagnoseLoading() {
  console.log('%c=== DASHBOARD LOADING DIAGNOSTIC ===', 'background: #291528; color: #fff; padding: 5px; font-size: 16px; font-weight: bold;');

  try {
    // Check if we're authenticated
    console.log('\n%c1. Checking Authentication...', 'color: #9e829c; font-weight: bold;');

    const response = await fetch('/api/auth/session', { credentials: 'include' });
    const session = await response.json();

    console.log('Session response:', session);

    if (!session || !session.user) {
      console.error('%c❌ NOT AUTHENTICATED', 'color: red; font-weight: bold;');
      console.log('You need to sign in first.');
      return;
    }

    console.log('%c✅ Authenticated', 'color: green;');
    console.log('User ID:', session.user.id);
    console.log('Email:', session.user.email);

    // Check user profile
    console.log('\n%c2. Checking User Profile...', 'color: #9e829c; font-weight: bold;');

    // Try to access the AuthContext from React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools detected');
    }

    // Check localStorage
    console.log('\n%c3. Checking LocalStorage...', 'color: #9e829c; font-weight: bold;');
    const localStorageKeys = Object.keys(localStorage).filter(k =>
      k.includes('supabase') || k.includes('auth')
    );
    console.log('Auth-related localStorage keys:', localStorageKeys);

    // Check for Supabase client
    console.log('\n%c4. Checking Supabase Connection...', 'color: #9e829c; font-weight: bold;');

    const supabaseUrl = localStorage.getItem('supabase.auth.url') || 'http://localhost:54321';
    console.log('Supabase URL:', supabaseUrl);

    try {
      const healthCheck = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
        }
      });

      if (healthCheck.ok) {
        console.log('%c✅ Supabase backend is responding', 'color: green;');
      } else {
        console.error('%c❌ Supabase backend returned error:', 'color: red;', healthCheck.status);
      }
    } catch (err) {
      console.error('%c❌ Cannot reach Supabase backend:', 'color: red;', err.message);
      console.log('%c⚠️  Is Supabase running? Run: npm run start (in backend directory)', 'color: orange;');
    }

    // Check current page state
    console.log('\n%c5. Checking Current Page State...', 'color: #9e829c; font-weight: bold;');
    console.log('Current URL:', window.location.href);
    console.log('Current pathname:', window.location.pathname);

    // Look for loading indicators
    const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
    console.log('Loading elements found:', loadingElements.length);
    if (loadingElements.length > 0) {
      console.log('Loading elements:', Array.from(loadingElements).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.textContent.substring(0, 50)
      })));
    }

    // Check for error messages
    const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
    if (errorElements.length > 0) {
      console.log('%c⚠️  Error elements found:', 'color: orange;', errorElements.length);
      console.log('Error elements:', Array.from(errorElements).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.textContent.substring(0, 100)
      })));
    }

    // Check Network tab
    console.log('\n%c6. Network Requests...', 'color: #9e829c; font-weight: bold;');
    console.log('Check the Network tab in DevTools for failed requests (red status codes)');
    console.log('Look for:');
    console.log('  - Failed API calls (401, 403, 500, etc.)');
    console.log('  - Slow requests (> 3 seconds)');
    console.log('  - CORS errors');

    // Summary
    console.log('\n%c=== DIAGNOSTIC COMPLETE ===', 'background: #291528; color: #fff; padding: 5px; font-size: 16px; font-weight: bold;');
    console.log('\n%cNext Steps:', 'color: #9e829c; font-weight: bold;');
    console.log('1. Check the Network tab for failed requests');
    console.log('2. Look at the Console for any error messages (red text)');
    console.log('3. If Supabase is not responding, make sure it\'s running:');
    console.log('   - Backend: npm run start');
    console.log('4. Share any errors you see with Claude');

  } catch (error) {
    console.error('%c❌ Diagnostic failed:', 'color: red; font-weight: bold;', error);
    console.log('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
})();
