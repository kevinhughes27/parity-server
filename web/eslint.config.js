import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslintParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Blob: 'readonly',
        prompt: 'readonly',
        console: 'readonly',
        JSX: 'readonly',
        React: 'readonly',
        alert: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLButtonElement: 'readonly',
        MouseEvent: 'readonly',
        Node: 'readonly',
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      'no-unused-vars': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  }
];
