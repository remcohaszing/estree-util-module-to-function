export default async () => {
  'use strict'
  const { ...copy } = original
  return {
    __proto__: null,
    copy
  }
}
