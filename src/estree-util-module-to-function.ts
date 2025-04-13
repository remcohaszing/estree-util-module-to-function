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
 * @returns
 *   The names of all export declarations found.
 */
function* findExportDeclarations(node: Pattern): Generator<string> {
  if (node.type === 'Identifier') {
    yield node.name
  } else if (node.type === 'ObjectPattern') {
    for (const property of node.properties) {
      yield* findExportDeclarations(
        property.type === 'RestElement' ? property.argument : property.value
      )
    }
  } else if (node.type === 'ArrayPattern') {
    for (const element of node.elements) {
      if (element) {
        yield* findExportDeclarations(element.type === 'RestElement' ? element.argument : element)
      }
    }
  }
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
function isShorthand(a: Identifier | Literal, b: Expression): boolean {
  return a.type === 'Identifier' && b.type === 'Identifier' && a.name === b.name
}

/**
 * Create a property that can be exported.
 *
 * @param key
 *   The key to export as.
 * @param value
 *   The value expression to export.
 * @returns
 *   A property for the returned exports.
 */
function createProperty(key: Identifier | Literal, value: Expression): Property {
  let computed = false
  if (key.type === 'Literal') {
    if (key.value === '__proto__') {
      computed = true
    }
  } else if (key.name === '__proto__') {
    computed = true
    key = { type: 'Literal', value: '__proto__' }
  }

  return {
    type: 'Property',
    computed,
    method: false,
    shorthand: !computed && isShorthand(key, value),
    kind: 'init',
    key,
    value
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
        result.push(createProperty({ type: 'Identifier', name }, { type: 'Identifier', name }))
      }
    }
  } else {
    result.push(
      createProperty(
        { type: 'Identifier', name: declaration.id.name },
        { type: 'Identifier', name: declaration.id.name }
      )
    )
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

  // Older versions of ESTree might not define node.attributes
  if (node.attributes?.length) {
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
  let directive: ExpressionStatement | undefined
  const importAssignments: (null | Pattern)[] = []
  const importExpressions: (CallExpression | ImportExpression)[] = []
  const toPatch: (MemberExpression | Property | SpreadElement)[] = []
  const exports: (Property | SpreadElement)[] = [
    {
      type: 'Property',
      computed: false,
      method: false,
      shorthand: false,
      kind: 'init',
      key: { type: 'Identifier', name: '__proto__' },
      value: { type: 'Literal', value: null }
    },
    {
      type: 'Property',
      computed: true,
      method: false,
      shorthand: false,
      kind: 'init',
      key: {
        type: 'MemberExpression',
        computed: false,
        optional: false,
        object: { type: 'Identifier', name: 'Symbol' },
        property: { type: 'Identifier', name: 'toStringTag' }
      },
      value: { type: 'Literal', value: 'Module' }
    }
  ]

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
            declaration.id ||= { type: 'Identifier', name: '__default_export__' }
            this.replace(declaration as ClassDeclaration | FunctionDeclaration)
            exports.push(
              createProperty(
                { type: 'Identifier', name: 'default' },
                { type: 'Identifier', name: declaration.id.name }
              )
            )
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
            exports.push(
              createProperty(
                { type: 'Identifier', name: 'default' },
                { type: 'Identifier', name: '__default_export__' }
              )
            )
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
              exports.push(createProperty(specifier.exported, specifier.local))
            }
          } else {
            for (const specifier of node.specifiers) {
              let { exported, local } = specifier
              if (local.type === 'Identifier' && local.name === '__proto__') {
                local = { type: 'Literal', value: '__proto__' }
              }
              const memberExpression: MemberExpression = {
                type: 'MemberExpression',
                computed: local.type === 'Literal',
                optional: false,
                object: {
                  type: 'MemberExpression',
                  computed: true,
                  optional: false,
                  object: { type: 'Identifier', name: '_imports' },
                  property: { type: 'Literal', value: importExpressions.length }
                },
                property: local
              }
              exports.push(createProperty(exported, memberExpression))
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
            ? createProperty(node.exported, memberExpression)
            : { type: 'SpreadElement', argument: memberExpression }
          const esmExpression = esmDeclarationToExpression(node, importName)
          exports.push(property)
          toPatch.push(property)
          importAssignments.push(null)
          importExpressions.push(
            node.exported
              ? esmExpression
              : {
                  type: 'CallExpression',
                  optional: false,
                  callee: {
                    type: 'MemberExpression',
                    object: esmExpression,
                    property: { type: 'Identifier', name: 'then' },
                    computed: false,
                    optional: false
                  },
                  arguments: [
                    {
                      type: 'ArrowFunctionExpression',
                      expression: true,
                      params: [
                        {
                          type: 'ObjectPattern',
                          properties: [
                            {
                              type: 'Property',
                              method: false,
                              shorthand: false,
                              computed: false,
                              kind: 'init',
                              key: { type: 'Identifier', name: 'default' },
                              value: { type: 'Identifier', name: '_' }
                            },
                            { type: 'RestElement', argument: { type: 'Identifier', name: 'm' } }
                          ]
                        }
                      ],
                      body: { type: 'Identifier', name: 'm' }
                    }
                  ]
                }
          )

          this.remove()
        }
      }
    }
  })

  if (importExpressions.length) {
    let importExpression: CallExpression | ImportExpression
    let importAssignment: null | Pattern

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
