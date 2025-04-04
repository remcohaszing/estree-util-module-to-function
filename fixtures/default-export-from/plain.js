export default async () => {
  'use strict'
  const _imports = await import('module')
  return {
    __proto__: null,
    default: _imports.default
  }
}
