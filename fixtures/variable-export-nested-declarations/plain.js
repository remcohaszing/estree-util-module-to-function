export default async () => {
  'use strict'
  const {
    deeply: [
      {
        nested: {
          items: [exported]
        }
      }
    ]
  } = original
  return {
    __proto__: null,
    [Symbol.toStringTag]: 'Module',
    exported
  }
}
