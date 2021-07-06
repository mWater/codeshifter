import jscodeshift, { FileInfo } from 'jscodeshift'
import { fstat, readFileSync, writeFileSync } from 'fs'
import removeInitClass from './remove-initclass'
import fixExportDefault from './fix-export-default'
import reactDeclareProps from './react-declare-props'
import reactDeclareState from './react-declare-state'

let src = readFileSync('./sample.ts', 'utf-8')

const j = jscodeshift.withParser("ts")

src = removeInitClass({ source: src } as any as FileInfo, { jscodeshift: j } as any)
src = fixExportDefault({ source: src } as any as FileInfo, { jscodeshift: j } as any)
src = reactDeclareProps({ source: src } as any as FileInfo, { jscodeshift: j } as any)
src = reactDeclareState({ source: src } as any as FileInfo, { jscodeshift: j } as any)
console.log(src)
writeFileSync("output.ts", src)
console.log("done")


