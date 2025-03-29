export default async (customImport) => {
  const { default: yaml, parse: parseYAML, stringify } = await customImport('yaml')
  return {}
}
