/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const _imports = await customImport('module')
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    reexport: _imports
  }
}
