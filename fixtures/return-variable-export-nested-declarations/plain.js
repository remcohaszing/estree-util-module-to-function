export default async () => {
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
