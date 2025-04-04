export default async () => {
  'use strict'
  const _imports = await Promise.all([
      import('./package.json'),
      import('./tsconfig.json'),
      import('./.c8rc'),
      import('./.remarkrc.yaml'),
      import('./.prettierrc.yaml'),
      import('./.eslintrc.yaml')
    ]),
    [{ default: pkg }, { compilerOptions }, c8] = _imports
  import('unified')
  return {
    __proto__: null,
    default: _imports[3].default,
    singleQuote: _imports[4].singleQuote,
    eslint: _imports[5]
  }
}
