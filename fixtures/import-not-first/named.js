/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  await customImport('unified')
  console.log('This code runs after the import')
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module'
  }
}
