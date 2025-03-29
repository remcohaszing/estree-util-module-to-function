export default async (customImport) => {
  const { useState: useAliasedState } = await customImport('react')
  return {}
}
