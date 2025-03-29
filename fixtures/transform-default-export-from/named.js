export default async (customImport) => {
  'use strict'
  const { default: __re_exported__default__ } = await customImport('module')
  return {
    default: __re_exported__default__
  }
}
