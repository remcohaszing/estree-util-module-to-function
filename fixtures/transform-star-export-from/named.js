/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const __re_exported_star__reexport__ = await customImport('module')
  return {
    reexport: __re_exported_star__reexport__
  }
}
