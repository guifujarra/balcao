import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'android',
      'ios',
      'test-results',
      'offline-test-results',
      'playwright-report',
    ],
  },
  js.configs.recommended,
  { files: ['scripts/*.mjs'], languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**', '**/mocks/**', '**/platform/**', '@capacitor/*'],
              message: 'Use um controller ou uma porta da aplicação.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'HTTP pertence a adapters de infraestrutura.' },
      ],
    },
  },
)
