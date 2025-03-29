import { parse } from 'acorn'
import { generate } from 'astring'
import { type Program } from 'estree'
import { moduleToFunction } from 'estree-util-module-to-function'
import { testFixturesDirectory } from 'snapshot-fixtures'

testFixturesDirectory({
  directory: new URL('../fixtures/', import.meta.url),
  prettier: true,
  write: true,
  tests: {
    'plain.js'(input) {
      const ast = parse(String(input), {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }) as Program
      moduleToFunction(ast)
      return `export default async () => {${generate(ast)}}`
    },

    'named.js'(input) {
      const importName = 'customImport'
      const ast = parse(String(input), {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }) as Program
      moduleToFunction(ast, { importName })
      return `export default async (${importName}) => {${generate(ast)}}`
    }
  }
})
