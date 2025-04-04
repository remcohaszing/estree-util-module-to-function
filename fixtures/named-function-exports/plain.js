export default async () => {
  'use strict'
  function fn() {}
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    fn
  }
}
