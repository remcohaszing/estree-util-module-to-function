/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const { 'use state': useAliasedState } = await customImport('react')
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module'
  }
}
