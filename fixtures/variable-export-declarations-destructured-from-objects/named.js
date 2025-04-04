/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const { age, name } = person
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    age,
    name
  }
}
