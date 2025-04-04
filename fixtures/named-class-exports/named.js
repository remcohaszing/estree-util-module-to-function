/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  class Person {}
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    Person
  }
}
