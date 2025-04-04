/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  customImport('path')
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module'
  }
}
