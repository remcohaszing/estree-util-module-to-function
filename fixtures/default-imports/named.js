/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const { default: remarkRehype } = await customImport('remark-rehype')
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module'
  }
}
