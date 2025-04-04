export default async () => {
  'use strict'
  const { age, name } = person
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    age,
    name
  }
}
