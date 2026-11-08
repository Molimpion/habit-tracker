const js = require('@eslint/js');

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  process: 'readonly',
  console: 'readonly',
  __dirname: 'readonly',
  Buffer: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Response: 'readonly',
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
};

module.exports = [
  { ignores: ['_site/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
  },
  {
    files: ['src/public/**/*.js', 'src/demo/boot.js'],
    languageOptions: {
      sourceType: 'script',
      globals: browserGlobals,
    },
  },
];
