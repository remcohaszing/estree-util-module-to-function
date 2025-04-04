export default async () => {
  'use strict'
  const answer = 42
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    'the answer to life, the universe, and everything': answer
  }
}
