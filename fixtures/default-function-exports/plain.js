export default async () => {
  'use strict'
  function fn() {}
  return {
    __proto__: null,
    default: fn
  }
}
