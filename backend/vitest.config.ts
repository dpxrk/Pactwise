import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
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
    },
  },
  define: {
    // Mock environment variables for tests
    'process.env.SUPABASE_URL': '"http://localhost:54321"',
    'process.env.SUPABASE_ANON_KEY': '"test-anon-key"',
    'process.env.SUPABASE_SERVICE_ROLE_KEY': '"test-service-key"',
  },
});