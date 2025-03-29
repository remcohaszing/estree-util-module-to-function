export default async (customImport) => {
  'use strict'
  class Pet {}
  return {
    default: Pet
  }
}
