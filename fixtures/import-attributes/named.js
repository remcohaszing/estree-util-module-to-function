/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const [
    { default: pkg },
    { compilerOptions },
    c8,
    { default: __re_exported__default__ },
    { singleQuote: __re_exported__singleQuote__ },
    __re_exported_star__eslint__
  ] = await Promise.all([
    customImport('./package.json', {
      with: {
        type: 'json'
      }
    }),
    customImport('./tsconfig.json', {
      with: {
        type: 'jsonc'
      }
    }),
    customImport('./.c8rc', {
      with: {
        type: 'json'
      }
    }),
    customImport('./.remarkrc.yaml', {
      with: {
        type: 'yaml'
      }
    }),
    customImport('./.prettierrc.yaml', {
      with: {
        type: 'yaml'
      }
    }),
    customImport('./.eslintrc.yaml', {
      with: {
        type: 'yaml'
      }
    })
  ])
  customImport('unified', {
    with: {
      'module-resolution': 'import'
    }
  })
  return {
    default: __re_exported__default__,
    singleQuote: __re_exported__singleQuote__,
    eslint: __re_exported_star__eslint__
  }
}
