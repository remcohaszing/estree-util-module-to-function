# estree-util-module-to-function

[![github actions](https://github.com/remcohaszing/estree-util-module-to-function/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/estree-util-module-to-function/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/remcohaszing/estree-util-module-to-function/branch/main/graph/badge.svg)](https://codecov.io/gh/remcohaszing/estree-util-module-to-function)
[![npm version](https://img.shields.io/npm/v/estree-util-module-to-function)](https://www.npmjs.com/package/estree-util-module-to-function)
[![npm downloads](https://img.shields.io/npm/dm/estree-util-module-to-function)](https://www.npmjs.com/package/estree-util-module-to-function)

Convert an estree module into a function body.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [`moduleToFunction(ast, options?)`](#moduletofunctionast-options)
- [Examples](#examples)
- [Security](#security)
- [Compatibility](#compatibility)
- [License](#license)

## Installation

```sh
npm install estree-util-module-to-function
```

## Usage

Typically you’ll get an AST from [`acorn`](https://github.com/acornjs/acorn), then process it.

```js
import { parse } from 'acorn'
import { moduleToFunction } from 'estree-util-module-to-function'

const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
moduleToFunction(ast)

console.dir(ast)
```

## API

This module exports a single function named `moduleToFunction`.

### `moduleToFunction(ast, options?)`

Convert an estree module into a function body. This modifies the input AST.

#### Options

- `importName`: A custom name for the import. By default, `import()` expressions are used. If this
  option is given, import expressions and import meta properties are transformed into identifiers
  using this name. (type: `string`)

## Examples

The following example shows how to read the home directory in Node.js by using ESM code from a
string.

```js
import { parse } from 'acorn'
import { generate } from 'astring'
import { moduleToFunction } from 'estree-util-module-to-function'

const AsyncFunction = (async () => {}).constructor

const source = `
import { readdir } from 'fs/promises'
import { homedir } from 'os'

const home = homedir()
export default home
export const files = await readdir(homedir())
`

const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
moduleToFunction(ast)
const transformed = generate(ast)
const fn = new AsyncFunction(transformed)

const result = await fn()
console.dir(result)
```

The following example is derived from the above. It injects a custom import function, which stubs
actual import behaviour.

```js
import { parse } from 'acorn'
import { generate } from 'astring'
import { moduleToFunction } from 'estree-util-module-to-function'

const AsyncFunction = (async () => {}).constructor

function customImport(name) {
  if (name === 'fs/promises') {
    return {
      readdir: () => ['foo.txt']
    }
  }
  if (name === 'os') {
    return {
      homedir: () => '/home/fakeuser'
    }
  }
}

const source = `
import { readdir } from 'fs/promises'
import { homedir } from 'os'

const home = homedir()
export default home
export const files = await readdir(homedir())
`

const importName = '__import__'
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
moduleToFunction(ast, { importName })
const transformed = generate(ast)
const fn = new AsyncFunction(importName, transformed)

const result = await fn(customImport)
console.dir(result)
```

## Security

This package only transforms the AST input, which is safe to use on its own. However, it was created
with the use case in mind to evaluate an ECMASscript module. Evaluating user input is dangerous and
should be avoided whenever possible.

## Compatibility

This project is compatible with Node.js 20 or greater.

## License

[MIT](LICENSE.md) © [Remco Haszing](https://github.com/remcohaszing)
