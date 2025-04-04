export default async () => {
  'use strict'
  const answer = 42
  return {
    __proto__: null,
    ['__proto__']: answer
  }
}
