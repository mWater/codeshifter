import jscodeshift, { FileInfo } from 'jscodeshift'
import { fstat, readFileSync, writeFileSync } from 'fs'
import transformer from './react-declare-props'

const src = readFileSync('./sample2.ts', 'utf-8')

const j = jscodeshift.withParser("ts")

const output = transformer({ source: src } as any as FileInfo, { jscodeshift: j } as any)
// writeFileSync("sample3.ts", output, "utf8")
console.log(output)
console.log("done")


