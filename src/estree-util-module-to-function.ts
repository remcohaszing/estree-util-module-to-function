import {
  type AssignmentProperty,
  type AwaitExpression,
  type CallExpression,
  type ClassDeclaration,
  type Declaration,
  type ExportAllDeclaration,
  type ExportNamedDeclaration,
  type Expression,
  type ExpressionStatement,
  type FunctionDeclaration,
  type Identifier,
  type ImportAttribute,
  type ImportDeclaration,
  type ImportExpression,
  type Literal,
  type MemberExpression,
  type MetaProperty,
  type ObjectExpression,
  type Pattern,
  type Program,
  type Property,
  type SpreadElement,
  type VariableDeclarator
} from 'estree'
import { walk } from 'estree-walker'

/**
 * Convert import attributes to an object expression.
 *
 * @param attributes
 *   The import attributes to turn into an object.
 * @returns
 *   An object that represents the import attributes.
 */
function convertImportAttributes(attributes: ImportAttribute[]): ObjectExpression {
  return {
    type: 'ObjectExpression',
    properties: [
      {
        type: 'Property',
        computed: false,
        method: false,
        shorthand: false,
        kind: 'init',
        key: { type: 'Identifier', name: 'with' },
        value: {
          type: 'ObjectExpression',
          properties: attributes.map(({ key, value }) => ({
            type: 'Property',
            computed: false,
            method: false,
            shorthand: false,
            kind: 'init',
            key,
            value
          }))
        }
      }
    ]
  }
}

/**
 * @param node
 *   The import expression to convert to a call expression.
 * @param importName
 *   The name of the callee.
 * @returns
 *   The import expression converted to a call expression.
 */
function convertImportExpression(node: ImportExpression, importName: string): CallExpression {
  const callExpression: CallExpression = {
    type: 'CallExpression',
    optional: false,
    callee: { type: 'Identifier', name: importName },
    arguments: [node.source]
  }

  if (node.options) {
    callExpression.arguments.push(node.options)
  }

  return callExpression
}

/**
 * Convert an import meta property to a regular member expression.
 *
 * @param node
 *   THe import meta property to convert
 * @param importName
 *   The name of the object containing the meta property.
 * @returns
 *   The meta property represented as a member expression.
 */
function convertMetaProperty(node: MetaProperty, importName: string): MemberExpression {
  return {
    type: 'MemberExpression',
    computed: false,
    optional: false,
    object: { type: 'Identifier', name: importName },
    property: node.property
  }
}

/**
 * Find all export declarations of a node.
 *
 * @param node
 *   The node on which to find export declarations.
 * @yields
 *   The names of all export declarations found.
 */
function* findExportDeclarations(node: Pattern): Generator<string> {
  if (node.type === 'Identifier') {
    yield node.name
  } else if (node.type === 'ObjectPattern') {
    for (const property of node.properties) {
      if (property.type === 'RestElement') {
        yield (property.argument as Identifier).name
      } else {
        yield* findExportDeclarations(property.value)
      }
    }
  } else if (node.type === 'ArrayPattern') {
    for (const element of node.elements) {
      if (element) {
        if (element.type === 'RestElement') {
          yield (element.argument as Identifier).name
        } else {
          yield* findExportDeclarations(element)
        }
      }
    }
  }
}

/**
 * Extract all export names of a variable declaration.
 *
 * @param declaration
 *   The declaration of which to find all exported names.
 * @returns
 *   An array of properties.
 */
function extractExportNames(declaration: Declaration): Property[] {
  const result: Property[] = []

  if (declaration.type === 'VariableDeclaration') {
    for (const declarator of declaration.declarations) {
      for (const name of findExportDeclarations(declarator.id)) {
        result.push({
          type: 'Property',
          computed: false,
          shorthand: true,
          method: false,
          kind: 'init',
          key: { type: 'Identifier', name },
          value: { type: 'Identifier', name }
        })
      }
    }
  } else {
    result.push({
      type: 'Property',
      computed: false,
      shorthand: true,
      method: false,
      kind: 'init',
      key: { type: 'Identifier', name: declaration.id.name },
      value: { type: 'Identifier', name: declaration.id.name }
    })
  }

  return result
}

/**
 * Transform ESM import or re-export declarations into import expressions.
 *
 * @param node
 *   The ESM node to transform.
 * @param importName
 *   The import name to use for the custom import.
 * @returns
 *   The ESM declaration as an import expression.
 */
function esmDeclarationToExpression(
  node: ExportAllDeclaration | ExportNamedDeclaration | ImportDeclaration,
  importName: string | undefined
): CallExpression | ImportExpression {
  let options: Expression | undefined

  if (node.attributes.length) {
    options = {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'Property',
          computed: false,
          method: false,
          shorthand: false,
          kind: 'init',
          key: {
            type: 'Identifier',
            name: 'with'
          },
          value: convertImportAttributes(node.attributes)
        }
      ]
    }
  }

  if (importName) {
    const callExpression: CallExpression = {
      type: 'CallExpression',
      optional: false,
      callee: { type: 'Identifier', name: importName },
      arguments: [node.source!]
    }

    if (options) {
      callExpression.arguments.push(options)
    }

    return callExpression
  }

  const importExpression: ImportExpression = {
    type: 'ImportExpression',
    source: node.source!
  }

  if (options) {
    importExpression.options = options
  }

  return importExpression
}

/**
 * Check if two identifiers can be used for a shorthand property.
 *
 * @param a
 *   The first potential identifier node
 * @param b
 *   The other potential identifier node
 * @returns
 *   Whether `a` and `b` are equal identifier nodes.
 */
function isShorthand(a: Identifier | Literal, b: Identifier | Literal): boolean {
  return a.type === 'Identifier' && b.type === 'Identifier' && a.name === b.name
}

/**
 * Replace import array references in the return exports with just a direct reference.
 *
 * The `Promise.all()` call is avoided when only one import expression is needed.
 *
 * @param node
 *   The node to replace the reference for.
 */
function singularImport(node: MemberExpression | Property | SpreadElement): undefined {
  switch (node.type) {
    case 'MemberExpression':
      if (node.object.type === 'MemberExpression') {
        node.object = node.object.object
      }
      return
    case 'Property':
      if (node.value.type === 'MemberExpression' && node.value.object.type === 'Identifier') {
        node.value = node.value.object
      }
      return
    case 'SpreadElement':
      if (node.argument.type === 'MemberExpression' && node.argument.object.type === 'Identifier') {
        node.argument = node.argument.object
      }
  }
}

/**
 * A function that looks like an import expression.
 */
export interface Import {
  /**
   * A custom dynamic import handler.
   *
   * @param specifier
   *   The module to import from.
   *
   *   See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import#modulename
   * @param options
   *   An object containing import options.
   *
   *   See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import#options
   * @returns
   *   A promise that resolves to the module.
   */
  (specifier: string, options?: ImportCallOptions): Promise<Record<string, unknown>>

  /**
   * The `import.meta` meta-property exposes context-specific metadata to a JavaScript module.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta
   */
  meta?: Partial<ImportMeta>
}

export namespace moduleToFunction {
  export interface Options {
    /**
     * If specified, a variable of this name will be used to replace imports.
     *
     * By default a dynamic import statements will be used.
     */
    importName?: string
  }
}

/**
 * Convert all ESM syntax into a dynamic alternative.
 *
 * @param ast
 *   The AST to process. The AST itself will be modified in place.
 * @param options
 *   Additional options.
 */
export function moduleToFunction(
  ast: Program,
  { importName }: moduleToFunction.Options = {}
): undefined {
  const importAssignments: (Pattern | null)[] = []
  const importExpressions: (CallExpression | ImportExpression)[] = []
  const exports: (Property | SpreadElement)[] = []
  const toPatch: (MemberExpression | Property | SpreadElement)[] = []
  let directive: ExpressionStatement | undefined

  walk(ast, {
    enter(node) {
      switch (node.type) {
        case 'ExpressionStatement': {
          const { expression } = node
          if (expression.type !== 'Literal') {
            return
          }

          if (expression.value !== 'use strict') {
            return
          }

          directive ||= node
          this.remove()
          return
        }

        case 'ImportDeclaration': {
          const properties: AssignmentProperty[] = []
          let starIdentifier: Identifier | null = null
          for (const specifier of node.specifiers) {
            switch (specifier.type) {
              case 'ImportDefaultSpecifier':
                properties.push({
                  type: 'Property',
                  computed: false,
                  method: false,
                  shorthand: false,
                  kind: 'init',
                  key: { type: 'Identifier', name: 'default' },
                  value: specifier.local
                })
                break
              case 'ImportNamespaceSpecifier':
                starIdentifier = specifier.local
                break
              case 'ImportSpecifier':
                properties.push({
                  type: 'Property',
                  computed: false,
                  method: false,
                  shorthand: isShorthand(specifier.imported, specifier.local),
                  kind: 'init',
                  key: specifier.imported,
                  value: specifier.local
                })
                break
            }
          }
          importAssignments.push(
            properties.length ? { type: 'ObjectPattern', properties } : starIdentifier
          )
          importExpressions.push(esmDeclarationToExpression(node, importName))
          this.remove()
          return
        }

        case 'ImportExpression':
          if (importName) {
            this.replace(convertImportExpression(node, importName))
          }
          return

        case 'MetaProperty':
          if (importName) {
            this.replace(convertMetaProperty(node, importName))
          }
          return

        case 'ExportDefaultDeclaration': {
          const { declaration } = node
          if (
            declaration.type === 'FunctionDeclaration' ||
            declaration.type === 'ClassDeclaration'
          ) {
            if (!declaration.id) {
              declaration.id = { type: 'Identifier', name: '__default_export__' }
            }
            this.replace(declaration as ClassDeclaration | FunctionDeclaration)
            exports.push({
              type: 'Property',
              computed: false,
              method: false,
              shorthand: false,
              kind: 'init',
              key: { type: 'Identifier', name: 'default' },
              value: { type: 'Identifier', name: declaration.id.name }
            })
          } else {
            this.replace({
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: [
                {
                  type: 'VariableDeclarator',
                  id: { type: 'Identifier', name: '__default_export__' },
                  init: declaration
                }
              ]
            })
            exports.push({
              type: 'Property',
              computed: false,
              method: false,
              shorthand: false,
              kind: 'init',
              key: { type: 'Identifier', name: 'default' },
              value: { type: 'Identifier', name: '__default_export__' }
            })
          }
          return
        }

        case 'ExportNamedDeclaration':
          if (node.declaration) {
            exports.push(...extractExportNames(node.declaration))
            this.replace(node.declaration)
            return
          }
          if (node.source == null) {
            for (const specifier of node.specifiers) {
              exports.push({
                type: 'Property',
                computed: false,
                kind: 'init',
                method: false,
                shorthand: isShorthand(specifier.exported, specifier.local),
                key: specifier.exported,
                value: specifier.local
              })
            }
          } else {
            for (const specifier of node.specifiers) {
              const memberExpression: MemberExpression = {
                type: 'MemberExpression',
                computed: specifier.local.type === 'Literal',
                optional: false,
                object: {
                  type: 'MemberExpression',
                  computed: true,
                  optional: false,
                  object: { type: 'Identifier', name: '_imports' },
                  property: { type: 'Literal', value: importExpressions.length }
                },
                property: specifier.local
              }
              exports.push({
                type: 'Property',
                computed: false,
                kind: 'init',
                method: false,
                shorthand: false,
                key: specifier.exported,
                value: memberExpression
              })
              toPatch.push(memberExpression)
            }
            importAssignments.push(null)
            importExpressions.push(esmDeclarationToExpression(node, importName))
          }
          this.remove()
          return

        case 'ExportAllDeclaration': {
          const memberExpression: MemberExpression = {
            type: 'MemberExpression',
            computed: true,
            optional: false,
            object: { type: 'Identifier', name: '_imports' },
            property: { type: 'Literal', value: importExpressions.length }
          }
          const property: Property | SpreadElement = node.exported
            ? {
                type: 'Property',
                computed: false,
                method: false,
                shorthand: false,
                kind: 'init',
                key: node.exported,
                value: memberExpression
              }
            : {
                type: 'SpreadElement',
                argument: memberExpression
              }
          exports.push(property)
          toPatch.push(property)
          importAssignments.push(null)
          importExpressions.push(esmDeclarationToExpression(node, importName))

          this.remove()
        }
      }
    }
  })

  if (importExpressions.length) {
    let importExpression: CallExpression | ImportExpression
    let importAssignment: Pattern | null

    if (importExpressions.length === 1) {
      importExpression = importExpressions[0]
      importAssignment = importAssignments[0]

      for (const node of toPatch) {
        singularImport(node)
      }
    } else {
      importExpression = {
        type: 'CallExpression',
        optional: false,
        callee: {
          type: 'MemberExpression',
          computed: false,
          optional: false,
          object: { type: 'Identifier', name: 'Promise' },
          property: { type: 'Identifier', name: 'all' }
        },
        arguments: [{ type: 'ArrayExpression', elements: importExpressions }]
      }
      while (importAssignments.length && !importAssignments.at(-1)) {
        importAssignments.pop()
      }
      importAssignment = { type: 'ArrayPattern', elements: importAssignments }
    }

    if (toPatch.length) {
      const declarations: VariableDeclarator[] = [
        {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: '_imports' },
          init: {
            type: 'AwaitExpression',
            argument: importExpression
          }
        }
      ]
      if (importAssignment) {
        declarations.push({
          type: 'VariableDeclarator',
          id: importAssignment,
          init: { type: 'Identifier', name: '_imports' }
        })
      }
      ast.body.unshift({
        type: 'VariableDeclaration',
        kind: 'const',
        declarations
      })
    } else {
      const awaitExpression: AwaitExpression = {
        type: 'AwaitExpression',
        argument: importExpression
      }

      ast.body.unshift(
        importAssignment
          ? {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: [
                {
                  type: 'VariableDeclarator',
                  id: importAssignment,
                  init: awaitExpression
                }
              ]
            }
          : {
              type: 'ExpressionStatement',
              expression: awaitExpression
            }
      )
    }
  }

  ast.body.unshift(
    directive ?? {
      type: 'ExpressionStatement',
      expression: { type: 'Literal', value: 'use strict' }
    }
  )

  ast.body.push({
    type: 'ReturnStatement',
    argument: { type: 'ObjectExpression', properties: exports }
  })
}
