export default async () => {
  'use strict'
  const _imports = await import('module')
  return {
    member: _imports['some member']
  }
}
