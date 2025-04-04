export default async () => {
  'use strict'
  await import('./style.css')
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module'
  }
}
