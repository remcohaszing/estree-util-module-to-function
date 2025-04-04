/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  await customImport('estree-walker')
  return {
    __proto__: null
  }
}
