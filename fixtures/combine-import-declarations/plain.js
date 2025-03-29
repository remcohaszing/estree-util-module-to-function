export default async () => {
  const [{ unified }, { default: remarkParse }, ,] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('./style.css')
  ])
  return {}
}
