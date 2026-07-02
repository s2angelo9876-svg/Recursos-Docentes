import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Los efectos de carga inicial son intencionales en este codebase
      'react-hooks/set-state-in-effect': 'off',
      // Los archivos de contexto exportan hook + provider
      'react-refresh/only-export-components': 'off',
      // Variables catch no usadas se marcan con guión bajo
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['server.js', 'server/**/*.js', 'scripts/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
