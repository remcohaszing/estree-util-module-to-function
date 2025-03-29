export default async (customImport) => {
  const { member: __re_exported__member__ } = await customImport('module')
  return {
    member: __re_exported__member__
  }
}
