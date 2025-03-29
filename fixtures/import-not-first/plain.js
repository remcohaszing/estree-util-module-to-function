export default async () => {
  'use strict'
  await import('unified')
  console.log('This code runs after the import')
  return {}
}
