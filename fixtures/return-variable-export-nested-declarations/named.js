export default async (customImport) => {
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
