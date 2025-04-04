/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  let variable
  const __default_export__ = (variable = 'value')
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    default: __default_export__
  }
}
