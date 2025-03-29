export default async (customImport) => {
  const [{ unified }, { default: remarkParse }, ,] = await Promise.all([
    customImport('unified'),
    customImport('remark-parse'),
    customImport('./style.css')
  ])
  return {}
}
