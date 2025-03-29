export default async (customImport) => {
  'use strict'
  const { default: remarkRehype } = await customImport('remark-rehype')
  return {}
}
