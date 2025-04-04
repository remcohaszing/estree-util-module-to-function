export default async () => {
  'use strict'
  const answer = 42
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    ['__proto__']: answer
  }
}
