export default async () => {
  'use strict'
  const _imports = await import('module')
  return {
    default: _imports.default
  }
}
