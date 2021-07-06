import { FileInfo, API, ExpressionStatement, AssignmentExpression, ObjectExpression, Property, Identifier, MemberExpression, ASTPath, ClassExpression, ExportDefaultDeclaration, ClassDeclaration, CallExpression, FunctionExpression } from 'jscodeshift'

export const parser = 'ts'

function searchUp(path: ASTPath, type: string) {
  while (path != null && path.node.type != type) {
    path = path.parentPath
  }
  return path
}

function searchUpParent(path: ASTPath, type: string) {
  while (path != null && (!path.parentPath || path.parentPath.node.type != type)) {
    path = path.parentPath
  }
  return path
}


export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;

  const classNames: string[] = []

  let src = file.source
  
  let x = j(src).get()

  src = j(src)
    .find(j.ExportDefaultDeclaration)
    .filter(path =>   
      path.node.declaration.type == "AssignmentExpression"
      && path.node.declaration.left.type == "Identifier"
      && path.node.declaration.right.type == "CallExpression"
      && path.node.declaration.right.arguments.length == 0)
    .forEach(path => {
      // Check if right type
      if (path.node.declaration.type != "AssignmentExpression") {
        return
      }
      const name = (path.node.declaration.left as Identifier).name

      // Check return
      const body = (path.node.declaration.right as CallExpression).callee
      if (body.type != "FunctionExpression") {
        return
      }
      const statements = body.body.body
      if (statements.length > 2) {
        return
      }
      if (statements.length > 1 && statements[1].type != "ReturnStatement") {
        return
      }
      if (statements[0].type != "ExpressionStatement" 
        || statements[0].expression.type != "AssignmentExpression" 
        || statements[0].expression.left.type != "Identifier"
        || statements[0].expression.left.name != name) {
          return
      }
      path.node.declaration = statements[0].expression.right

      // Remove let
      j(searchUp(path, "Program"))
        .find(j.VariableDeclaration)
        .filter(p => p.node.declarations[0].type == "VariableDeclarator" && p.node.declarations[0].id.type == "Identifier" && p.node.declarations[0].id.name == name)
        .replaceWith(null)
    })
    .toSource();
    return src
}


