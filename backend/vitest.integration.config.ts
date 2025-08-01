import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.integration.test.ts'],
    testTimeout: 60000, // 1 minute timeout for integration tests
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './supabase'),
      '@types': path.resolve(__dirname, './supabase/types'),
      '@functions': path.resolve(__dirname, './supabase/functions'),
      '@utils': path.resolve(__dirname, './supabase/functions-utils'),
    },
  },
});