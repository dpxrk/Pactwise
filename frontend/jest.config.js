/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.spec.tsx'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        moduleResolution: 'node',
        isolatedModules: true
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/$1',
    // Important: These must come before the generic convex mapping
    '^convex/values$': '<rootDir>/node_modules/convex/dist/cjs/values/index.js',
    '^convex/server$': '<rootDir>/node_modules/convex/dist/cjs/server/index.js',
    '^convex/_generated/(.*)$': '<rootDir>/convex/_generated/$1',
    // Generic convex mapping must come last
    '^convex/(.*)$': '<rootDir>/convex/$1',
    '^convex$': '<rootDir>/node_modules/convex/dist/cjs/index.js'
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  collectCoverageFrom: [
    'convex/**/*.{ts,tsx}',
    '!convex/_generated/**',
    '!convex/node_modules/**',
    '!convex/**/*.d.ts',
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/app/**',
    '!src/middleware.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/dist/', '/convex/_generated/'],
  maxWorkers: '50%',
  testTimeout: 30000
}