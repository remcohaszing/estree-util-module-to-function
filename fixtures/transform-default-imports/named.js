export default async (customImport) => {
  const { default: remarkRehype } = await customImport('remark-rehype')
  return {}
}
