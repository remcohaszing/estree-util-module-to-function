/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const { member: __re_exported__member__ } = await customImport('module')
  return {
    member: __re_exported__member__
  }
}
