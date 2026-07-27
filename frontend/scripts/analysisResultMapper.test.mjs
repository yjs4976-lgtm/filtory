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
    preVisitCheckScore: 59,
    analyzedReviewCount: 3,
    analysisConfidence: "low",
    analysisConfidenceDescription: "리뷰 수가 적어 해석에 주의가 필요해요.",
    scoreBreakdown: {
      evidenceScore: 68,
      riskScore: 24,
      specificityScore: 73,
      diversityScore: 81,
      concreteAspectCount: 5,
      softPromoScore: 31,
      lexicalUniqueScore: 76,
      rawReviewTrustScore: 77,
      adjustedReviewTrustScore: 71,
      trustAdjustmentPenalty: 6,
      hardCapApplied: false,
    },
  },
})

assert.equal(nestedCamelCase.scores.reviewTrustScore, 71)
assert.equal(nestedCamelCase.scores.preVisitCheckScore, 59)
assert.equal(nestedCamelCase.scores.analyzedReviewCount, 3)
assert.equal(nestedCamelCase.analysisConfidence.key, "low")
assert.equal(nestedCamelCase.analysisConfidence.description, "리뷰 수가 적어 해석에 주의가 필요해요.")
assert.equal(nestedCamelCase.scoreBreakdown.evidenceScore, 68)
assert.equal(nestedCamelCase.scoreBreakdown.riskScore, 24)
assert.equal(nestedCamelCase.scoreBreakdown.specificityScore, 73)
assert.equal(nestedCamelCase.scoreBreakdown.diversityScore, 81)
assert.equal(nestedCamelCase.scoreBreakdown.concreteAspectCount, 5)
assert.equal(nestedCamelCase.scoreBreakdown.softPromoScore, 31)
assert.equal(nestedCamelCase.scoreBreakdown.lexicalUniqueScore, 76)
assert.equal(nestedCamelCase.scoreBreakdown.rawReviewTrustScore, 77)
assert.equal(nestedCamelCase.scoreBreakdown.adjustedReviewTrustScore, 71)
assert.equal(nestedCamelCase.scoreBreakdown.trustAdjustmentPenalty, 6)
assert.equal(nestedCamelCase.scoreBreakdown.hardCapApplied, false)

const historySnakeCase = normalizeAnalysisResult({
  hospitalName: "샘플의원",
  category: "derma",
  naverPlaceUrl: "https://map.naver.com/p/example",
  homepageUrl: "https://example.test",
  score: 66,
  review_trust_score: 66,
  totalReviewCount: 6,
  analysisConfidence: "medium",
  score_breakdown: {
    evidence_score: 61,
    risk_score: 35,
    specificity_score: 57,
    diversity_score: 74,
  },
})

assert.equal(historySnakeCase.scores.reviewTrustScore, 66)
assert.equal(historySnakeCase.scores.analyzedReviewCount, 6)
assert.equal(historySnakeCase.analysisConfidence.key, "medium")
assert.equal(historySnakeCase.information.checkedCount, 4)
assert.equal(historySnakeCase.scoreBreakdown.evidenceScore, 61)
assert.equal(historySnakeCase.scoreBreakdown.riskScore, 35)
assert.equal(historySnakeCase.scoreBreakdown.specificityScore, 57)
assert.equal(historySnakeCase.scoreBreakdown.diversityScore, 74)

console.log("analysisResultMapper tests passed")
