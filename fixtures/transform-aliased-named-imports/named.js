export default async (customImport) => {
  'use strict'
  const { useState: useAliasedState } = await customImport('react')
  return {}
}
