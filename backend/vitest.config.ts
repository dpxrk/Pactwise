import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/edge-functions/**/*.test.ts'],
    exclude: [
      'tests/**/*.integration.test.ts', // Exclude integration tests from unit test run
    ],
    testTimeout: 30000, // 30 second timeout
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'supabase/functions/local-agents/**', // Complex agent code
      ],
    },
  },
  esbuild: {
    target: 'node18', // Ensure compatibility
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './supabase'),
      '@types': path.resolve(__dirname, './supabase/types'),
      '@functions': path.resolve(__dirname, './supabase/functions'),
      '@utils': path.resolve(__dirname, './supabase/functions-utils'),
      // Redirect Deno URL imports to npm packages for Node.js test environment
      'https://deno.land/x/zod@v3.22.4/mod.ts': 'zod',
      'https://deno.land/std@0.168.0/encoding/base64.ts': path.resolve(__dirname, './tests/mocks/base64-mock.ts'),
      'https://deno.land/x/djwt@v2.8/mod.ts': path.resolve(__dirname, './tests/mocks/djwt-mock.ts'),
      'https://esm.sh/@supabase/supabase-js@2.39.0': '@supabase/supabase-js',
      'https://esm.sh/@supabase/supabase-js@2.38.0': '@supabase/supabase-js',
      'https://deno.land/std@0.177.0/http/server.ts': path.resolve(__dirname, './tests/mocks/deno-server-mock.ts'),
    },
  },
  define: {
    // Mock environment variables for tests
    'process.env.SUPABASE_URL': '"http://localhost:54321"',
    'process.env.SUPABASE_ANON_KEY': '"test-anon-key"',
    'process.env.SUPABASE_SERVICE_ROLE_KEY': '"test-service-key"',
  },
});