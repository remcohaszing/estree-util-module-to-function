/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const { useState: useAliasedState } = await customImport('react')
  return {}
}
