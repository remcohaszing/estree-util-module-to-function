import {
  type AssignmentProperty,
  type AwaitExpression,
  type CallExpression,
  type ExportNamedDeclaration,
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
  type Statement,
  type VariableDeclaration
} from 'estree'
import { walk } from 'estree-walker'

type ImportTuple = [specifier: Identifier | ObjectPattern | null, source: Literal]

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
        specifier.type === 'ImportSpecifier' && specifier.imported.name === specifier.local.name,
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

function convertImportExpression(node: ImportExpression, importName: string): CallExpression {
  return {
    type: 'CallExpression',
    optional: false,
    callee: { type: 'Identifier', name: importName },
    arguments: [node.source]
  }
}

function convertMetaProperty(node: MetaProperty, importName: string): MemberExpression {
  return {
    type: 'MemberExpression',
    computed: false,
    optional: false,
    object: { type: 'Identifier', name: importName },
    property: node.property
  }
}

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
        key: { type: 'Identifier', name: node.declaration.id!.name },
        value: { type: 'Identifier', name: node.declaration.id!.name }
      })
    }
  }

  for (const specifier of node.specifiers) {
    result.push({
      type: 'Property',
      computed: false,
      shorthand: !node.source && specifier.exported.name === specifier.local.name,
      method: false,
      kind: 'init',
      key: specifier.exported,
      value: node.source
        ? { type: 'Identifier', name: `__re_exported__${specifier.local.name}__` }
        : specifier.local
    })
  }

  return result
}

function createDynamicImports(imports: ImportTuple[], importName?: string): Statement {
  const importExpressions: (CallExpression | ImportExpression)[] = imports.map(([, imp]) =>
    importName
      ? {
          type: 'CallExpression',
          optional: false,
          callee: { type: 'Identifier', name: importName },
          arguments: [imp]
        }
      : {
          type: 'ImportExpression',
          source: imp
        }
  )

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
            arguments: [
              {
                type: 'ArrayExpression',
                elements: importExpressions
              }
            ]
          }
  }

  for (const [imp] of imports) {
    if (imp) {
      return {
        type: 'VariableDeclaration',
        kind: 'const',
        declarations: [
          {
            type: 'VariableDeclarator',
            id:
              imports.length === 1
                ? imports[0][0]!
                : { type: 'ArrayPattern', elements: imports.map(([mappedImport]) => mappedImport) },
            init: expression
          }
        ]
      }
    }
  }

  return { type: 'ExpressionStatement', expression }
}

export interface ModuleToFunctionOptions {
  /**
   * If specified, a variable of this name will be used to replace imports.
   *
   * By default a dynamic import statements will be used.
   */
  importName?: string
}

/**
 * Convert all ESM syntax into a dynamic alternative.
 *
 * @param ast The AST to process. The AST itself will be modified in place.
 * @param options Additional options.
 */
export function moduleToFunction(ast: Program, { importName }: ModuleToFunctionOptions = {}): void {
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
          this.replace(declaration)
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
          } as VariableDeclaration)
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
        const name = `__re_exported_star__${node.exported!.name}__`
        imports.push([{ type: 'Identifier', name }, node.source])
        exports.push({
          type: 'Property',
          computed: false,
          method: false,
          shorthand: false,
          kind: 'init',
          key: { type: 'Identifier', name: node.exported!.name },
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
