export default async () => {
  'use strict'
  const _imports = await import('module')
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    reexport: _imports
  }
}
