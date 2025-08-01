/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__/frontend'],
  testMatch: [
    '**/__tests__/frontend/**/*.test.ts',
    '**/__tests__/frontend/**/*.test.tsx',
    '**/__tests__/frontend/**/*.spec.ts',
    '**/__tests__/frontend/**/*.spec.tsx'
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
    '^convex/react$': '<rootDir>/node_modules/convex/dist/cjs/react/index.js',
    '^convex/values$': '<rootDir>/node_modules/convex/dist/cjs/values/index.js',
    '^convex/server$': '<rootDir>/node_modules/convex/dist/cjs/server/index.js',
    // Handle all variations of convex generated imports
    '^(\\.\\./)*convex/_generated/(.*)$': '<rootDir>/__tests__/frontend/__mocks__/convexMocks.js',
    '^convex/_generated/(.*)$': '<rootDir>/__tests__/frontend/__mocks__/convexMocks.js',
    '^convex/(.*)$': '<rootDir>/convex/$1',
    '^convex$': '<rootDir>/node_modules/convex/dist/cjs/index.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__tests__/frontend/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.frontend.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/app/api/**',
    '!src/middleware.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx'
  ],
  coverageDirectory: 'coverage/frontend',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/dist/', '/convex/_generated/'],
  maxWorkers: '50%',
  testTimeout: 30000
};