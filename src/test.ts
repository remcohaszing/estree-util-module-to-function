import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parse } from 'acorn'
import { generate } from 'astring'
import { type Node, type Program } from 'estree'
import { moduleToFunction, type ModuleToFunctionOptions } from 'estree-util-module-to-function'

const testCases = {
  'transform default imports': {
    input: "import remarkRehype from 'remark-rehype'",
    plainOutput: "const {default: remarkRehype} = await import('remark-rehype');\nreturn {};\n",
    namedOutput:
      "const {default: remarkRehype} = await customImport('remark-rehype');\nreturn {};\n"
  },

  'transform named imports': {
    input: "import { useState } from 'react'",
    plainOutput: "const {useState} = await import('react');\nreturn {};\n",
    namedOutput: "const {useState} = await customImport('react');\nreturn {};\n"
  },

  'transform aliased named imports': {
    input: "import { useState as useAliasedState } from 'react'",
    plainOutput: "const {useState: useAliasedState} = await import('react');\nreturn {};\n",
    namedOutput: "const {useState: useAliasedState} = await customImport('react');\nreturn {};\n"
  },

  'transform wildcard imports': {
    input: "import * as monaco from 'monaco-editor'",
    plainOutput: "const monaco = await import('monaco-editor');\nreturn {};\n",
    namedOutput: "const monaco = await customImport('monaco-editor');\nreturn {};\n"
  },

  'transform bare imports': {
    input: "import './style.css'",
    plainOutput: "await import('./style.css');\nreturn {};\n",
    namedOutput: "await customImport('./style.css');\nreturn {};\n"
  },

  'combine import specifiers': {
    input: "import yaml, { parse as parseYAML, stringify } from 'yaml'",
    plainOutput:
      "const {default: yaml, parse: parseYAML, stringify} = await import('yaml');\nreturn {};\n",
    namedOutput:
      "const {default: yaml, parse: parseYAML, stringify} = await customImport('yaml');\nreturn {};\n"
  },

  'combine import declarations': {
    input:
      "import { unified } from 'unified'\nimport remarkParse from 'remark-parse'\nimport './style.css'",
    plainOutput:
      "const [{unified}, {default: remarkParse}, , ] = await Promise.all([import('unified'), import('remark-parse'), import('./style.css')]);\nreturn {};\n",
    namedOutput:
      "const [{unified}, {default: remarkParse}, , ] = await Promise.all([customImport('unified'), customImport('remark-parse'), customImport('./style.css')]);\nreturn {};\n"
  },

  'convert import expressions': {
    input: 'import("path")',
    plainOutput: 'import("path");\nreturn {};\n',
    namedOutput: 'customImport("path");\nreturn {};\n'
  },

  'convert meta properties': {
    input: 'import.meta.url',
    plainOutput: 'import.meta.url;\nreturn {};\n',
    namedOutput: 'customImport.meta.url;\nreturn {};\n'
  },

  'return export specifiers': {
    input: 'const answer = 42;export {answer}',
    plainOutput: 'const answer = 42;\nreturn {\n  answer\n};\n',
    namedOutput: 'const answer = 42;\nreturn {\n  answer\n};\n'
  },

  'return aliased export specifiers': {
    input: 'const answer = 42;export { answer as everything }',
    plainOutput: 'const answer = 42;\nreturn {\n  everything: answer\n};\n',
    namedOutput: 'const answer = 42;\nreturn {\n  everything: answer\n};\n'
  },

  'return default function exports': {
    input: 'export default function fn() {}',
    plainOutput: 'function fn() {}\nreturn {\n  default: fn\n};\n',
    namedOutput: 'function fn() {}\nreturn {\n  default: fn\n};\n'
  },

  'return default class exports': {
    input: 'export default class Pet {}',
    plainOutput: 'class Pet {}\nreturn {\n  default: Pet\n};\n',
    namedOutput: 'class Pet {}\nreturn {\n  default: Pet\n};\n'
  },

  'return default variable assignment exports': {
    input: 'let variable\nexport default variable = "value"',
    plainOutput:
      'let variable;\nconst __default_export__ = variable = "value";\nreturn {\n  default: __default_export__\n};\n',
    namedOutput:
      'let variable;\nconst __default_export__ = variable = "value";\nreturn {\n  default: __default_export__\n};\n'
  },

  'return default const exports': {
    input: 'export default "constant"',
    plainOutput:
      'const __default_export__ = "constant";\nreturn {\n  default: __default_export__\n};\n',
    namedOutput:
      'const __default_export__ = "constant";\nreturn {\n  default: __default_export__\n};\n'
  },

  'return named function exports': {
    input: 'export function fn() {}',
    plainOutput: 'function fn() {}\nreturn {\n  fn\n};\n',
    namedOutput: 'function fn() {}\nreturn {\n  fn\n};\n'
  },

  'return named class exports': {
    input: 'export class Person {}',
    plainOutput: 'class Person {}\nreturn {\n  Person\n};\n',
    namedOutput: 'class Person {}\nreturn {\n  Person\n};\n'
  },

  'return simple variable export declarations': {
    input: 'export const cat = "meow"',
    plainOutput: 'const cat = "meow";\nreturn {\n  cat\n};\n',
    namedOutput: 'const cat = "meow";\nreturn {\n  cat\n};\n'
  },

  'return variable export declarations destructured from objects': {
    input: 'export const { age, name } = person',
    plainOutput: 'const {age, name} = person;\nreturn {\n  age,\n  name\n};\n',
    namedOutput: 'const {age, name} = person;\nreturn {\n  age,\n  name\n};\n'
  },

  'return variable export rest declarations destructured from objects': {
    input: 'export const { ...copy } = original',
    plainOutput: 'const {...copy} = original;\nreturn {\n  copy\n};\n',
    namedOutput: 'const {...copy} = original;\nreturn {\n  copy\n};\n'
  },

  'return variable export declarations destructured from arrays': {
    input: 'export const [one, , three] = counts',
    plainOutput: 'const [one, , three] = counts;\nreturn {\n  one,\n  three\n};\n',
    namedOutput: 'const [one, , three] = counts;\nreturn {\n  one,\n  three\n};\n'
  },

  'return variable export rest declarations destructured from arrays': {
    input: 'export const [...more] = counts',
    plainOutput: 'const [...more] = counts;\nreturn {\n  more\n};\n',
    namedOutput: 'const [...more] = counts;\nreturn {\n  more\n};\n'
  },

  'return variable export nested declarations': {
    input: 'export const { deeply: [{ nested: { items: [exported] } }] } = original',
    plainOutput:
      'const {deeply: [{nested: {items: [exported]}}]} = original;\nreturn {\n  exported\n};\n',
    namedOutput:
      'const {deeply: [{nested: {items: [exported]}}]} = original;\nreturn {\n  exported\n};\n'
  },

  'transform named export from': {
    input: 'export { member } from "module"',
    plainOutput:
      'const {member: __re_exported__member__} = await import("module");\nreturn {\n  member: __re_exported__member__\n};\n',
    namedOutput:
      'const {member: __re_exported__member__} = await customImport("module");\nreturn {\n  member: __re_exported__member__\n};\n'
  },

  'transform default export from': {
    input: 'export { default } from "module"',
    plainOutput:
      'const {default: __re_exported__default__} = await import("module");\nreturn {\n  default: __re_exported__default__\n};\n',
    namedOutput:
      'const {default: __re_exported__default__} = await customImport("module");\nreturn {\n  default: __re_exported__default__\n};\n'
  },
  'transform star export from': {
    input: 'export * as reexport from "module"',
    plainOutput:
      'const __re_exported_star__reexport__ = await import("module");\nreturn {\n  reexport: __re_exported_star__reexport__\n};\n',
    namedOutput:
      'const __re_exported_star__reexport__ = await customImport("module");\nreturn {\n  reexport: __re_exported_star__reexport__\n};\n'
  }
}

function process(source: string, options?: ModuleToFunctionOptions): string {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }) as Node as Program
  moduleToFunction(ast, options)
  return generate(ast)
}

for (const [description, { input, namedOutput, plainOutput }] of Object.entries(testCases)) {
  test(`${description} (plain)`, () => {
    const result = process(input)

    assert.equal(result, plainOutput)
  })

  test(`${description} (named)`, () => {
    const result = process(input, { importName: 'customImport' })

    assert.equal(result, namedOutput)
  })
}
