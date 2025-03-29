export default async (customImport) => {
  'use strict'
  await customImport('estree-walker')
  return {}
}
