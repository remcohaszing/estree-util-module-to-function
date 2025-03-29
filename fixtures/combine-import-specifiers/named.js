export default async (customImport) => {
  'use strict'
  const { default: yaml, parse: parseYAML, stringify } = await customImport('yaml')
  return {}
}
