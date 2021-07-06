import { ASTPath, FileInfo, API, MemberExpression, ClassDeclaration, ClassExpression, ExportDefaultDeclaration } from "jscodeshift";

export const parser = 'ts'

/* Transform that removes initClass pattern from classes. Transforms into static declarations instead */
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

  let src = file.source
  
  let x = j(src).get()

  src = j(src)
    .find(j.ClassMethod)
    .filter(path => path.node.key.type == "Identifier" && path.node.key.name == "initClass")
    .forEach(path => {
      // Find top level of initClass
      const topLevel = searchUpParent(path, "ClassBody")

      let classPath = searchUp(path, "ClassExpression")
      let className: string

      // If default kind
      if (classPath) {
        className = (classPath.node as ClassExpression).id!.name
      }
      else {
        classPath = searchUp(path, "ClassDeclaration")
        className = (classPath.node as ClassDeclaration).id!.name
      }

      // Find assignment expressions with this on left
      j(path)
        .find(j.AssignmentExpression)
        .filter(p => p.node.left.type == "MemberExpression" 
          && p.node.left.object.type == "ThisExpression")
        .forEach(p => {
          // Add as static
          topLevel.insertBefore(j.classProperty((p.node.left as MemberExpression).property, p.node.right, null, true))

          // Remove assignment
          p.replace()
        })

      // Delete initClass if empty
      if (j(path).find(j.AssignmentExpression).paths().length == 0) {
        topLevel.replace()

        // Remove initClass call
        j(searchUp(path, "Program"))
          .find(j.CallExpression)
          .filter(path => path.node.callee.type == "MemberExpression" 
            && path.node.callee.property.type == "Identifier" 
            && path.node.callee.property.name == "initClass"
            && path.node.callee.object.type == "Identifier"
            && path.node.callee.object.name == className)
          .forEach(p => {
            if (p.parent.node.type != "ExpressionStatement") {
              throw new Error("Wrong parent type")
            }
            p.parentPath.replace()
          })
        }
    }).toSource()

  return src
}
