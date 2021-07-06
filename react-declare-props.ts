import { FileInfo, API, ExpressionStatement, AssignmentExpression, ObjectExpression, Property, Identifier, MemberExpression, ASTPath, ClassExpression, ExportDefaultDeclaration, ClassDeclaration, ObjectProperty } from 'jscodeshift'

export const parser = 'ts'

interface PropType {
  name: string
  optional: boolean
  type: string
  comment: string | null
}

function extractPropTypes(propTypes: ObjectProperty[]): PropType[] {
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
    .find(j.ClassProperty)
    .filter(path => path.node.key.type == "Identifier" && path.node.key.name == "propTypes" && path.node.value != null && path.node.value.type == "ObjectExpression")
    .forEach(path => {
      // Get propTypes
      const properties = (path.node.value! as ObjectExpression).properties as ObjectProperty[]
      const propTypes = extractPropTypes(properties)

      let classPath = searchUp(path, "ClassDeclaration")
      if (!classPath) {
        console.log(`Class not found`)
        return
      }

      // Check that not typed
      if ((classPath.node as ClassDeclaration).superTypeParameters 
        && (classPath.node as ClassDeclaration).superTypeParameters!.params
        && (classPath.node as ClassDeclaration).superTypeParameters!.params.length > 0) {
        console.log(`Already generic`)
        return
      }
      let className = (classPath.node as ClassDeclaration).id!.name
      
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

      // Remove property
      path.replace()

    })
    .toSource();
    return src
}
