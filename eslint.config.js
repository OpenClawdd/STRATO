export default [
  { ignores: ['node_modules/**', 'data/**', 'coverage/**', 'public/uv/**', 'public/scramjet/**', 'public/bare-mux/**', 'public/epoxy/**'] },
  {
    files: ['src/**/*.js', 'public/js/v5/**/*.js', 'scripts/validate-games.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { AbortController: 'readonly', AbortSignal: 'readonly', Buffer: 'readonly', CustomEvent: 'readonly', Event: 'readonly', FormData: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', clearInterval: 'readonly', clearTimeout: 'readonly', console: 'readonly', document: 'readonly', fetch: 'readonly', globalThis: 'readonly', indexedDB: 'readonly', localStorage: 'readonly', process: 'readonly', setInterval: 'readonly', setTimeout: 'readonly', window: 'readonly' },
    },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'no-undef': 'error' },
  },
];
