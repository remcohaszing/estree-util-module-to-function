export default async () => {
  'use strict'
  class Person {}
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    Person
  }
}
