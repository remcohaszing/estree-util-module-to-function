export default async (customImport) => {
  await customImport('./style.css')
  return {}
}
