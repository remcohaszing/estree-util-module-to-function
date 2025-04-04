export default async () => {
  'use strict'
  function strictFunction() {}
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module'
  }
}
