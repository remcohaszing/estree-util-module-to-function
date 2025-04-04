export default async () => {
  'use strict'
  const [one, , three] = counts
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    one,
    three
  }
}
