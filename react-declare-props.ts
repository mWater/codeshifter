import { FileInfo, API, ExpressionStatement, AssignmentExpression, ObjectExpression, Property, Identifier, MemberExpression, ASTPath, ClassExpression, ExportDefaultDeclaration, ClassDeclaration } from 'jscodeshift'

export const parser = 'ts'

interface PropType {
  name: string
  optional: boolean
  type: string
  comment: string | null
}

function extractPropTypes(propTypes: Property[]): PropType[] {
  const props: PropType[] = []

  // Extract propTypes
  for (const prop of propTypes) {
    if (prop.key.type != "Identifier" || prop.value.type != "MemberExpression") {
      throw new Error(`INVALID: ${prop.value.type}`)
    }

    const name = prop.key.name
    // console.log(`Name: ${name}`)
    const comment = prop.comments ? prop.comments[0].value.trim() : null

    let type: string = ""
    let optional: boolean = false

    // If optional
    if (prop.value.property.type == "Identifier" && prop.value.object.type == "Identifier") {
      type = prop.value.property.name
      // console.log(`OPTIONAL TYPE: ${type}`)
      optional = true
    }
    else if (prop.value.property.type == "Identifier" && prop.value.object.type == "MemberExpression" && prop.value.object.property.type == "Identifier") {
      type = prop.value.object.property.name
      // console.log(prop.value.object)
      // console.log(`REQUIRED TYPE: ${type}`)
    }
    else {
      console.warn(`WEIRD: ${name}`)
      type = "any"
    }

    if (type == "bool") {
      type = "boolean"
    }
    else if (type == "string") {
      type = "string"
    }
    else if (type == "number") {
      type = "number"
    }
    else {
      type = "any"
    }

    // console.log(prop.value.property.type)
    // console.log(prop.value.object.type)
    // console.log(prop.)
    // console.log(comment)
    props.push({ 
      name,
      type,
      comment,
      optional
    })
  }  
  return props
}

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
    .find(j.ClassMethod)
    .filter(path => path.node.key.type == "Identifier" && path.node.key.name == "initClass")
    .forEach(path => {
      // Find propTypes and thus if React
      const propTypesPath = j(path).find(j.Identifier).filter(p => p.node.name == "propTypes").paths()[0]
      if (!propTypesPath) {
        return
      }

      // Get propTypes
      const properties = j(propTypesPath).closest(j.AssignmentExpression).find(j.ObjectExpression).get().node.properties
      const propTypes = extractPropTypes(properties)

      let classPath = searchUp(path, "ClassExpression")
      let className: string

      // If default kind
      if (classPath) {
        className = (classPath.node as ClassExpression).id!.name

        // Clean up definition
        const exportDecl = searchUp(path, "ExportDefaultDeclaration")
        if (exportDecl) {
          (exportDecl.node as ExportDefaultDeclaration).declaration = classPath.node as any
        }

        // TODO Comments?
      }
      else {
        classPath = searchUp(path, "ClassDeclaration")
        className = (classPath.node as ClassDeclaration).id!.name
      }

      console.log(className)


      // Add interface
      const ifcode = `interface ${className}Props {${propTypes.map(prop => `\n${prop.comment ? `  /** ${prop.comment} */\n` : "  "}${prop.name}${prop.optional ? "?" : ""}: ${prop.type}`)}
}`
      // Find Program
      const topPath = searchUpParent(path, "Program")
      topPath.insertBefore(ifcode)

      // Get superclass
      const superClass = (classPath.node as ClassExpression | ClassDeclaration).superClass!
      if (superClass.type == "Identifier") {
        (classPath.node as ClassExpression | ClassDeclaration).superClass = `${superClass.name}<${className}Props>` as any
      }
      else if (superClass.type == "MemberExpression" && superClass.property.type == "Identifier") {
        ((classPath.node as ClassExpression | ClassDeclaration).superClass! as any).property = `${superClass.property.name}<${className}Props>`
      }
      else {
        throw new Error("SUPERCLASS")
      }

      // Check if initClass is empty
      if (j(path).find(j.AssignmentExpression).paths().length == 1) {
        // Remove initClass function 
        path.replace()

        // Remove initClass call
        j(searchUp(path, "Program"))
          .find(j.CallExpression)
          .filter(path => path.node.callee.type == "MemberExpression" 
            && path.node.callee.property.type == "Identifier" 
            && path.node.callee.property.name == "initClass"
            && path.node.callee.object.type == "Identifier"
            && path.node.callee.object.name == className)
          .replaceWith(null)
      }
      else {
        // Just remove expression statement
        j(propTypesPath).closest(j.ExpressionStatement).replaceWith(null)

        // Ensure initClass is called
        if (j(searchUp(path, "Program"))
          .find(j.CallExpression)
          .filter(path => path.node.callee.type == "MemberExpression" 
            && path.node.callee.property.type == "Identifier" 
            && path.node.callee.property.name == "initClass"
            && path.node.callee.object.type == "Identifier"
            && path.node.callee.object.name == className)
          .paths().length == 0) {
          topPath.insertAfter(`\n${className}.initClass()`)
        }
      }

      // Remove let
      j(searchUp(path, "Program"))
        .find(j.VariableDeclaration)
        .filter(p => p.node.declarations[0].type == "VariableDeclarator" && p.node.declarations[0].id.type == "Identifier" && p.node.declarations[0].id.name == className)
        .replaceWith(null)
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


