export default async () => {
  'use strict'
  const _imports = await import('module').then(({ default: _, ...m }) => m)
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    ..._imports
  }
}
