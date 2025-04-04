/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const { default: yaml, parse: parseYAML, stringify } = await customImport('yaml')
  return {
    __proto__: null
  }
}
