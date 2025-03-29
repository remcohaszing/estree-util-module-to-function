export default async (customImport) => {
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
