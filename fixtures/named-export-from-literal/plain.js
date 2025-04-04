export default async () => {
  'use strict'
  const _imports = await import('module')
  return {
    'some member': _imports.member
  }
}
