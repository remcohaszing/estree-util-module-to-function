/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const _imports = await Promise.all([
      customImport('./package.json', {
        with: {
          with: {
            type: 'json'
          }
        }
      }),
      customImport('./tsconfig.json', {
        with: {
          with: {
            type: 'jsonc'
          }
        }
      }),
      customImport('./.c8rc', {
        with: {
          with: {
            type: 'json'
          }
        }
      }),
      customImport('./.remarkrc.yaml', {
        with: {
          with: {
            type: 'yaml'
          }
        }
      }),
      customImport('./.prettierrc.yaml', {
        with: {
          with: {
            type: 'yaml'
          }
        }
      }),
      customImport('./.eslintrc.yaml', {
        with: {
          with: {
            type: 'yaml'
          }
        }
      })
    ]),
    [{ default: pkg }, { compilerOptions }, c8] = _imports
  customImport('unified', {
    with: {
      'module-resolution': 'import'
    }
  })
  return {
    __proto__: null,
    default: _imports[3].default,
    singleQuote: _imports[4].singleQuote,
    eslint: _imports[5]
  }
}
