/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const [one, , three] = counts
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    one,
    three
  }
}
