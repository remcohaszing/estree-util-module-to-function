export default async () => {
  'use strict'
  const [
    { default: pkg },
    { compilerOptions },
    c8,
    { default: __re_exported__default__ },
    { singleQuote: __re_exported__singleQuote__ },
    __re_exported_star__eslint__
  ] = await Promise.all([
    import('./package.json'),
    import('./tsconfig.json'),
    import('./.c8rc'),
    import('./.remarkrc.yaml'),
    import('./.prettierrc.yaml'),
    import('./.eslintrc.yaml')
  ])
  import('unified')
  return {
    default: __re_exported__default__,
    singleQuote: __re_exported__singleQuote__,
    eslint: __re_exported_star__eslint__
  }
}
