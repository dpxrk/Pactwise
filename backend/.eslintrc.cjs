module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'error',

    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-alert': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Code quality rules
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-rename': 'error',
    'prefer-destructuring': ['error', {
      'VariableDeclarator': {
        'array': false,
        'object': true
      },
      'AssignmentExpression': {
        'array': true,
        'object': false
      }
    }],

    // Error prevention
    'no-unreachable': 'error',
    'no-unreachable-loop': 'error',
    'no-constant-condition': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty': 'error',
    'no-ex-assign': 'error',
    'no-func-assign': 'error',
    'no-import-assign': 'error',
    'no-invalid-regexp': 'error',
    'no-irregular-whitespace': 'error',
    'no-obj-calls': 'error',
    'no-prototype-builtins': 'error',
    'no-sparse-arrays': 'error',
    'no-unexpected-multiline': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',

    // Best practices
    'array-callback-return': 'error',
    'curly': 'error',
    'default-case': 'error',
    'default-case-last': 'error',
    'eqeqeq': ['error', 'always'],
    'no-caller': 'error',
    'no-case-declarations': 'error',
    'no-constructor-return': 'error',
    'no-else-return': 'error',
    'no-empty-function': 'warn',
    'no-empty-pattern': 'error',
    'no-fallthrough': 'error',
    'no-global-assign': 'error',
    'no-implicit-coercion': 'error',
    'no-implicit-globals': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-multi-assign': 'error',
    'no-new': 'error',
    'no-new-wrappers': 'error',
    'no-octal': 'error',
    'no-octal-escape': 'error',
    'no-param-reassign': 'error',
    'no-redeclare': 'error',
    'no-return-assign': 'error',
    'no-return-await': 'off', // Handled by @typescript-eslint/return-await
    '@typescript-eslint/return-await': 'error',
    'no-self-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'off', // Handled by @typescript-eslint/no-throw-literal
    '@typescript-eslint/no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'off', // Handled by @typescript-eslint/no-unused-expressions
    '@typescript-eslint/no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-catch': 'error',
    'no-useless-concat': 'error',
    'no-useless-escape': 'error',
    'no-useless-return': 'error',
    'no-void': 'error',
    'no-with': 'error',
    'prefer-promise-reject-errors': 'error',
    'radix': 'error',
    'require-atomic-updates': 'error',
    'yoda': 'error',

    // Stylistic rules (basic formatting)
    'comma-dangle': ['error', 'always-multiline'],
    'comma-spacing': 'error',
    'comma-style': 'error',
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'no-trailing-spaces': 'error',
    'object-curly-spacing': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'space-before-function-paren': ['error', {
      'anonymous': 'always',
      'named': 'never',
      'asyncArrow': 'always'
    }],
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': 'error',
  },
  overrides: [
    {
      // Test files
      files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
      env: {
        node: true,
        jest: false,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests for mocking
        '@typescript-eslint/no-non-null-assertion': 'off', // Allow ! in tests
        'no-console': 'off', // Allow console in tests
      },
    },
    {
      // Edge Functions
      files: ['supabase/functions/**/*.ts'],
      env: {
        node: true,
        browser: false,
      },
      globals: {
        Deno: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
      },
      rules: {
        'no-console': ['warn', { allow: ['warn', 'error', 'log'] }], // Allow console.log in Edge Functions for debugging
        '@typescript-eslint/no-explicit-any': 'warn', // More lenient for Edge Functions due to complex request/response types
      },
    },
    {
      // Migration files
      files: ['supabase/migrations/**/*.sql'],
      rules: {
        // Disable all rules for SQL files
      },
    },
    {
      // Configuration files
      files: ['*.config.js', '*.config.ts', '.eslintrc.js'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.d.ts',
    'supabase/migrations/**/*.sql',
    'coverage/',
    '.env*',
    '*.log',
    'vitest.config.ts',
    'vitest.integration.config.ts',
  ],
};