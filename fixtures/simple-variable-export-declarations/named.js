/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const cat = 'meow'
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    cat
  }
}
