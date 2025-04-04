/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const monaco = await customImport('monaco-editor')
  return {
    __proto__: null
  }
}
