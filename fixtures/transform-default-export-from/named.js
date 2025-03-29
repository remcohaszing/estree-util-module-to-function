export default async (customImport) => {
  const { default: __re_exported__default__ } = await customImport('module')
  return {
    default: __re_exported__default__
  }
}
