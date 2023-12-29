module.exports = {
  root: true,
  env: {
    es2018: true
  },
  extends: ['prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  plugins: ['prettier'],
  rules: {
    'comma-dangle': 0,
    'import/prefer-default-export': 0,
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        arrowParens: 'always',
        printWidth: 120
      }
    ],
    'no-console': 'off',
    'no-underscore-dangle': ['error', { allow: ['_id'] }],
    'object-curly-newline': 'off'
  }
};
