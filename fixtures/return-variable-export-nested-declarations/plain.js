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
    exported
  }
}
