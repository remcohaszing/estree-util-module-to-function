import {
  type AssignmentProperty,
  type AwaitExpression,
  type CallExpression,
  type ClassDeclaration,
  type ExportNamedDeclaration,
  type FunctionDeclaration,
  type Identifier,
  type ImportDeclaration,
  type ImportExpression,
  type Literal,
  type MemberExpression,
  type MetaProperty,
  type ObjectPattern,
  type Pattern,
  type Program,
  type Property,
  type Statement
} from 'estree'
import { walk } from 'estree-walker'

type ImportTuple = [
  //
  /**
   * An identifier for a namespace import, an object pattern for named or default exports, or null
   * for bare imports.
   */
  specifier: Identifier | ObjectPattern | null,

  /**
   * The source the import originated from.
   */
  source: Literal
]

/**
 * @param node
 *   The import declaration to turn into an import tuple.
 * @returns
 *   An import tuple.
 */
function convertImportDeclaration(node: ImportDeclaration): ImportTuple {
  const properties: AssignmentProperty[] = []

  for (const specifier of node.specifiers) {
    if (specifier.type === 'ImportNamespaceSpecifier') {
      return [specifier.local, node.source]
    }
    properties.push({
      type: 'Property',
      method: false,
      shorthand:
        specifier.type === 'ImportSpecifier' &&
        (specifier.imported as Identifier).name === specifier.local.name,
      computed: false,
      kind: 'init',
      key:
        specifier.type === 'ImportDefaultSpecifier'
          ? { type: 'Identifier', name: 'default' }
          : specifier.imported,
      value: specifier.local
    })
  }

  return [properties.length ? { type: 'ObjectPattern', properties } : null, node.source]
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
  return {
    type: 'CallExpression',
    optional: false,
    callee: { type: 'Identifier', name: importName },
    arguments: [node.source]
  }
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
 * Extract all export names of a named export.
 *
 * @param node
 *   The export declaration of which to find all exported names.
 * @returns
 *   An array of properties.
 */
function extractExportNames(node: ExportNamedDeclaration): Property[] {
  const result: Property[] = []

  if (node.declaration) {
    if (node.declaration.type === 'VariableDeclaration') {
      for (const declarator of node.declaration.declarations) {
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
        key: { type: 'Identifier', name: node.declaration.id.name },
        value: { type: 'Identifier', name: node.declaration.id.name }
      })
    }
  }

  for (const specifier of node.specifiers) {
    result.push({
      type: 'Property',
      computed: false,
      shorthand:
        !node.source &&
        (specifier.exported as Identifier).name === (specifier.local as Identifier).name,
      method: false,
      kind: 'init',
      key: specifier.exported,
      value: node.source
        ? { type: 'Identifier', name: `__re_exported__${(specifier.local as Identifier).name}__` }
        : specifier.local
    })
  }

  return result
}

/**
 * Create dynamic imports from import tuples.
 *
 * If multiple imports are found, they are combined into a `Promise.all()` call.
 *
 * @param imports
 *   The import tuples from which to create dynamic imports.
 * @param importName
 *   The name of a custom identifier to use.
 * @returns
 *   An expression that contains all dynamic imports.
 */
function createDynamicImports(imports: ImportTuple[], importName?: string): Statement {
  const importExpressions: (CallExpression | ImportExpression)[] = []
  const specifiers: (Pattern | null)[] = []
  let hasSpecifiers = false

  for (const [specifier, source] of imports) {
    importExpressions.push(
      importName
        ? {
            type: 'CallExpression',
            optional: false,
            callee: { type: 'Identifier', name: importName },
            arguments: [source]
          }
        : { type: 'ImportExpression', source }
    )

    hasSpecifiers ||= Boolean(specifier)
    specifiers.push(specifier)
  }

  const expression: AwaitExpression = {
    type: 'AwaitExpression',
    argument:
      imports.length === 1
        ? importExpressions[0]
        : {
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
  }

  if (hasSpecifiers) {
    return {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [
        {
          type: 'VariableDeclarator',
          id:
            imports.length === 1 ? specifiers[0]! : { type: 'ArrayPattern', elements: specifiers },
          init: expression
        }
      ]
    }
  }

  return { type: 'ExpressionStatement', expression }
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
  const imports: ImportTuple[] = []
  const exports: Property[] = []

  walk(ast, {
    enter(baseNode) {
      const node = baseNode
      if (node.type === 'ImportDeclaration') {
        imports.push(convertImportDeclaration(node))
        this.remove()
      } else if (node.type === 'ImportExpression') {
        if (importName) {
          this.replace(convertImportExpression(node, importName))
        }
      } else if (node.type === 'MetaProperty') {
        if (importName) {
          this.replace(convertMetaProperty(node, importName))
        }
      } else if (node.type === 'ExportDefaultDeclaration') {
        const { declaration } = node
        if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') {
          this.replace(declaration as ClassDeclaration | FunctionDeclaration)
          exports.push({
            type: 'Property',
            computed: false,
            method: false,
            shorthand: false,
            kind: 'init',
            key: { type: 'Identifier', name: 'default' },
            value: { type: 'Identifier', name: declaration.id!.name }
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
      } else if (node.type === 'ExportNamedDeclaration') {
        const nodeExports = [...extractExportNames(node)]
        exports.push(...nodeExports)
        if (node.declaration) {
          this.replace(node.declaration)
        } else {
          this.remove()
          if (node.source) {
            imports.push([
              {
                type: 'ObjectPattern',
                properties: nodeExports.map((property) => ({
                  type: 'Property',
                  computed: false,
                  method: false,
                  shorthand: false,
                  kind: 'init',
                  key: { type: 'Identifier', name: (property.key as Identifier).name },
                  value: { type: 'Identifier', name: (property.value as Identifier).name }
                }))
              },
              node.source
            ])
          }
        }
      } else if (node.type === 'ExportAllDeclaration') {
        const name = `__re_exported_star__${(node.exported as Identifier).name}__`
        imports.push([{ type: 'Identifier', name }, node.source])
        exports.push({
          type: 'Property',
          computed: false,
          method: false,
          shorthand: false,
          kind: 'init',
          key: { type: 'Identifier', name: (node.exported as Identifier).name },
          value: { type: 'Identifier', name }
        })
        this.remove()
      }
    }
  })

  if (imports.length) {
    ast.body.unshift(createDynamicImports(imports, importName))
  }

  ast.body.push({
    type: 'ReturnStatement',
    argument: { type: 'ObjectExpression', properties: exports }
  })
}
