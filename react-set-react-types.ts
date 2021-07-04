import { FileInfo, API, ExpressionStatement, AssignmentExpression, ObjectExpression, Property, Identifier, MemberExpression, ASTPath, ClassExpression, ExportDefaultDeclaration, ClassDeclaration, objectExpression } from 'jscodeshift'
import _ from 'lodash'

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

  let src = file.source
  
  // Find React classes
  src = j(src)
    .find(j.ClassDeclaration)
    .forEach(path => {
      const className = (path.node as ClassDeclaration).id!.name

      // Get superclass
      const superClass = path.node.superClass
      if (!superClass) {
        return
      }
      if (superClass.type == "Identifier") {
        // console.log(superClass)
        if (superClass.name != "Component") {
          return
        }
        // (classPath.node as ClassExpression | ClassDeclaration).superClass = `${superClass.name}<${className}Props>` as any
      }
      else if (superClass.type == "MemberExpression" && superClass.property.type == "Identifier") {
        // console.log(superClass)
        if (superClass.property.name != "Component") {
          return
        }
        // ((classPath.node as ClassExpression | ClassDeclaration).superClass! as any).property = `${superClass.property.name}<${className}Props>`
      }
      else {
        throw new Error("SUPERCLASS")
      }
      if (!path.node.superTypeParameters) {
        return
      }

      // Find methods
      const states: string[] = []

      j(path)
        .find(j.MemberExpression)
        .filter(p => p.node.object.type == "MemberExpression"
          && p.node.object.object.type == "ThisExpression"
          && p.node.object.property.type == "Identifier" 
          && p.node.object.property.name == "state"
          && p.node.property.type == "Identifier")
        .forEach(p => {
          states.push((p.node.property as Identifier).name)
        })

      if (states.length == 0) {
        return
      }
      if (!path.node.superTypeParameters) {
        return
      }
      if (path.node.superTypeParameters.params.length == 2) {
        return
      }

      path.node.superTypeParameters.params.push(`${className}State` as any)

      // Add interface
      const ifcode = `interface ${className}State {${_.uniq(states).map(state => `\n${state}: any`)}
}`
      // Find Program
      const topPath = searchUpParent(path, "Program")
      topPath.insertBefore(ifcode)

      
//       // Add interface
//       const ifcode = `interface ${className}Props {${propTypes.map(prop => `\n${prop.comment ? `  /** ${prop.comment} */\n` : "  "}${prop.name}${prop.optional ? "?" : ""}: ${prop.type}`)}
// }`
//       // Find Program
//       const topPath = searchUpParent(path, "Program")
//       topPath.insertBefore(ifcode)

//       // Get superclass
//       const superClass = (classPath.node as ClassExpression | ClassDeclaration).superClass!
//       if (superClass.type == "Identifier") {
//         (classPath.node as ClassExpression | ClassDeclaration).superClass = `${superClass.name}<${className}Props>` as any
//       }
//       else if (superClass.type == "MemberExpression" && superClass.property.type == "Identifier") {
//         ((classPath.node as ClassExpression | ClassDeclaration).superClass! as any).property = `${superClass.property.name}<${className}Props>`
//       }
//       else {
//         throw new Error("SUPERCLASS")
//       }

//       // Remove initClass function
//       path.replace()

//       // Remove initClass call
//       j(searchUp(path, "Program"))
//         .find(j.CallExpression)
//         .filter(path => path.node.callee.type == "MemberExpression" 
//           && path.node.callee.property.type == "Identifier" 
//           && path.node.callee.property.name == "initClass"
//           && path.node.callee.object.type == "Identifier"
//           && path.node.callee.object.name == className)
//         .replaceWith(null)

//       // Remove let
//       j(searchUp(path, "Program"))
//         .find(j.VariableDeclaration)
//         .filter(p => p.node.declarations[0].type == "VariableDeclarator" && p.node.declarations[0].id.type == "Identifier" && p.node.declarations[0].id.name == className)
//         .replaceWith(null)
    })
    .toSource();
    return src
}



    // const killLets: string[] = []

    // // Simplify complex export
    // src = j(src)
    //   .find(j.ExportDefaultDeclaration)
    //   .forEach(p => {
    //     // console.log(p.node.declaration)
        
    //     const comments = p.node.comments
    //     const paths = j(p).find(j.ClassExpression).paths()
    //     if (paths.length == 1 && classNames.includes(paths[0].node.id!.name)) {
    //       // console.log(paths[0].node)
    //       killLets.push(paths[0].node.id!.name)
    //       p.node.declaration = paths[0].node
    //       p.node.comments = comments
    //     }
    //   })
    //   .toSource()

    // // Remove let
    // for (const className of killLets) {
    //   src = j(src)
    //     .find(j.VariableDeclaration)
    //     .filter(p => p.node.declarations[0].type == "VariableDeclarator" && p.node.declarations[0].id.type == "Identifier" && p.node.declarations[0].id.name == className)
    //     // .forEach(p => {
    //     //   console.log(p.node.id)
    //     // })
    //     .replaceWith(null)
    //     .toSource()
    // }


