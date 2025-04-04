/** @param {import('estree-util-module-to-function').Import} customImport */
export default async (customImport) => {
  'use strict'
  const answer = 42
  return {
    __proto__: null,
    everything: answer
  }
}
