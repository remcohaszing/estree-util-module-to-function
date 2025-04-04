export default async () => {
  'use strict'
  const _imports = await import('module')
  return {
    __proto__: null,
    'some member': _imports.member
  }
}
