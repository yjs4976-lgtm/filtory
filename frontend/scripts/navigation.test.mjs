import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const baseRequire = createRequire(import.meta.url)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, "..")

function loadTypeScriptModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText

  const cjsModule = { exports: {} }
  const executeModule = new Function("require", "module", "exports", output)
  executeModule(baseRequire, cjsModule, cjsModule.exports)

  return cjsModule.exports
}

const { sanitizeInternalNextPath } = loadTypeScriptModule(
  path.join(projectRoot, "src/lib/navigation.ts")
)

assert.equal(sanitizeInternalNextPath("/history"), "/history")
assert.equal(sanitizeInternalNextPath("/history?page=2"), "/history?page=2")
assert.equal(sanitizeInternalNextPath("https://evil.example"), null)
assert.equal(sanitizeInternalNextPath("//evil.example"), null)
assert.equal(sanitizeInternalNextPath("/\\evil.example"), null)
assert.equal(sanitizeInternalNextPath("/%5C%5Cevil.example"), null)
