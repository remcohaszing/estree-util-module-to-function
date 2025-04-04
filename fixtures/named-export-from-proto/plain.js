export default async () => {
  'use strict'
  const _imports = await import('module')
  return {
    __proto__: null,
    ['__proto__']: _imports['__proto__']
  }
}
