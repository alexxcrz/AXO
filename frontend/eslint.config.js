import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['public/service-worker.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // ── Errores reales ──────────────────────────────────────────
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],

      // ── Advertencias de estilo — desactivadas ───────────────────
      'react/prop-types': 'off',
      'no-restricted-globals': 'off',
      'sonarjs/cognitive-complexity': 'off',

      // ── React Compiler ─────────────────────────────────────────
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/no-deriving-state-in-effects': 'warn',
      'no-empty': 'warn',
      'no-constant-binary-expression': 'warn',

      // ── Advertencias de accesibilidad — desactivadas ────────────
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/aria-role': 'off',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'off',
    },
  },
  {
    files: ['**/ComponentesDashboard.jsx', '**/MediaLightbox.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])

