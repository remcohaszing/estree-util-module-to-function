export default async (customImport) => {
  'use strict'
  await customImport('unified')
  console.log('This code runs after the import')
  return {}
}
