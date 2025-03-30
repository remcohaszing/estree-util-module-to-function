// astring doesn’t support options for import expressions.
import pkg from './package.json' with { type: 'json' }
import { compilerOptions } from './tsconfig.json' with { type: 'jsonc' }
import * as c8 from './.c8rc' with { type: 'json' }
export { default } from './.remarkrc.yaml' with { type: 'yaml' }
export { singleQuote } from './.prettierrc.yaml' with { type: 'yaml' }
export * as eslint from './.eslintrc.yaml' with { type: 'yaml' }
import('unified', { with: { 'module-resolution': 'import' } })
