import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const baseRequire = createRequire(import.meta.url)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, "..")
const moduleCache = new Map()

function resolveTypeScriptModule(specifier, fromFile) {
  if (specifier.startsWith("@/")) {
    return path.join(projectRoot, "src", `${specifier.slice(2)}.ts`)
  }
  if (specifier.startsWith(".")) {
    const resolved = path.resolve(path.dirname(fromFile), specifier)
    return path.extname(resolved) ? resolved : `${resolved}.ts`
  }
  return null
}

function loadTypeScriptModule(filePath) {
  const resolvedPath = path.resolve(filePath)
  const cachedModule = moduleCache.get(resolvedPath)
  if (cachedModule) return cachedModule.exports

  const output = ts.transpileModule(fs.readFileSync(resolvedPath, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const cjsModule = { exports: {} }
  moduleCache.set(resolvedPath, cjsModule)
  const localRequire = (specifier) => {
    const resolvedModule = resolveTypeScriptModule(specifier, resolvedPath)
    return resolvedModule ? loadTypeScriptModule(resolvedModule) : baseRequire(specifier)
  }
  new Function("require", "module", "exports", output)(localRequire, cjsModule, cjsModule.exports)
  return cjsModule.exports
}

const { normalizeAnalysisResult } = loadTypeScriptModule(
  path.join(projectRoot, "src/lib/analysisResultMapper.ts")
)

const nestedCamelCase = normalizeAnalysisResult({
  hospitalName: "샘플의원",
  result: {
    totalScore: 71,
    reviewTrustScore: 71,
    scoreBreakdown: {
      evidenceScore: 68,
      riskScore: 24,
      specificityScore: 73,
      diversityScore: 81,
    },
  },
})

assert.equal(nestedCamelCase.scores.reviewTrustScore, 71)
assert.equal(nestedCamelCase.scoreBreakdown.evidenceScore, 68)
assert.equal(nestedCamelCase.scoreBreakdown.riskScore, 24)
assert.equal(nestedCamelCase.scoreBreakdown.specificityScore, 73)
assert.equal(nestedCamelCase.scoreBreakdown.diversityScore, 81)

const historySnakeCase = normalizeAnalysisResult({
  hospitalName: "샘플의원",
  score: 66,
  review_trust_score: 66,
  score_breakdown: {
    evidence_score: 61,
    risk_score: 35,
    specificity_score: 57,
    diversity_score: 74,
  },
})

assert.equal(historySnakeCase.scores.reviewTrustScore, 66)
assert.equal(historySnakeCase.scoreBreakdown.evidenceScore, 61)
assert.equal(historySnakeCase.scoreBreakdown.riskScore, 35)
assert.equal(historySnakeCase.scoreBreakdown.specificityScore, 57)
assert.equal(historySnakeCase.scoreBreakdown.diversityScore, 74)

console.log("analysisResultMapper tests passed")
