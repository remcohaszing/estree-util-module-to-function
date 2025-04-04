export default async () => {
  'use strict'
  const cat = 'meow'
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    cat
  }
}
