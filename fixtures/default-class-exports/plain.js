export default async () => {
  'use strict'
  class Pet {}
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    default: Pet
  }
}
