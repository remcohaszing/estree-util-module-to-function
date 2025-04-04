/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const [{ unified }, { default: remarkParse }] = await Promise.all([
    customImport('unified'),
    customImport('remark-parse'),
    customImport('./style.css')
  ])
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module'
  }
}
