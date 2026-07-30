import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const baseRequire = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const cache = new Map()

function loadTypeScriptModule(filePath) {
  const resolvedPath = path.resolve(filePath)
  if (cache.has(resolvedPath)) return cache.get(resolvedPath).exports

  const source = fs.readFileSync(resolvedPath, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const cjsModule = { exports: {} }
  cache.set(resolvedPath, cjsModule)

  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) {
      return loadTypeScriptModule(path.join(projectRoot, "src", `${specifier.slice(2)}.ts`))
    }
    if (specifier.startsWith(".")) {
      const candidate = path.resolve(path.dirname(resolvedPath), specifier)
      return loadTypeScriptModule(path.extname(candidate) ? candidate : `${candidate}.ts`)
    }
    return baseRequire(specifier)
  }
  new Function("require", "module", "exports", output)(localRequire, cjsModule, cjsModule.exports)
  return cjsModule.exports
}

const {
  normalizeFeaturedNotice,
  selectActiveNotice,
} = loadTypeScriptModule(path.join(projectRoot, "src/services/noticeService.ts"))

const notice = {
  id: 7,
  title: "서비스 점검 안내",
  pinned: true,
  publishedAt: "2026-07-29T00:00:00+00:00",
}

assert.equal(normalizeFeaturedNotice({ success: true, message: "ok" }), null)
assert.equal(normalizeFeaturedNotice(null), null)
assert.deepEqual(normalizeFeaturedNotice(notice), notice)
assert.equal(selectActiveNotice([], 0), null)
assert.deepEqual(selectActiveNotice([notice], 0), notice)

console.log("notice service tests passed")
