/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  function fn() {}
  return {
    __proto__: null,
    default: fn
  }
}
