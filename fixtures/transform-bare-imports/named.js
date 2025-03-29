export default async (customImport) => {
  'use strict'
  await customImport('./style.css')
  return {}
}
