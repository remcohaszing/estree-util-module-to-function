export default async () => {
  'use strict'
  const _imports = await import('module')
  return {
    reexport: _imports
  }
}
