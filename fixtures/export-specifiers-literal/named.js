/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const answer = 42
  return {
    'the answer to life, the universe, and everything': answer
  }
}
