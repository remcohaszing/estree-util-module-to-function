export default async (customImport) => {
  const __re_exported_star__reexport__ = await customImport('module')
  return {
    reexport: __re_exported_star__reexport__
  }
}
