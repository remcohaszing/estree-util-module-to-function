import config from '@remcohaszing/eslint'

export default [
  ...config,
  { ignores: ['fixtures'] },
  {
    rules: {
      'no-param-reassign': 'off',
      'require-await': 'off'
    }
  }
]
