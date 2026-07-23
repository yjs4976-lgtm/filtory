import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const baseRequire = createRequire(import.meta.url)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, "..")
const source = fs.readFileSync(path.join(projectRoot, "src/lib/reviewTextParser.ts"), "utf8")
const output = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText
const cjsModule = { exports: {} }
new Function("require", "module", "exports", output)(baseRequire, cjsModule, cjsModule.exports)

const { splitReviewText } = cjsModule.exports
const sample = [
  "Won Hyoung Lee",
  "리뷰 16사진 14",
  "의사 선생님이 설명을 자세히 해주시고 대기 시간도 짧아서 만족했습니다.",
  "방문일7.20.월2026년 7월 20일 월요일1번째 방문인증 수단영수증",
  "반응 남기기",
  "",
  "암암7591 리뷰 24 사진 5",
  "검사 전에 과정을 친절하게 안내해 주셔서 편하게 진료받았어요.",
  "병원 답변",
  "소중한 리뷰 감사합니다. 앞으로도 최선을 다하겠습니다.",
  "",
  "리뷰어123",
  "리뷰 3 사진 1",
  "예약 시간에 맞춰 방문했고 상담과 치료 과정이 전반적으로 만족스러웠어요.",
  "영수증",
  "펼쳐서 더보기",
].join("\n")

const parsed = splitReviewText(sample)

assert.equal(parsed.length, 3)
assert.ok(parsed.every((review) => !/리뷰\s*\d|사진\s*\d|방문일|영수증|병원 답변/.test(review)))
assert.ok(parsed.some((review) => review.includes("대기 시간도 짧아서")))
assert.ok(parsed.some((review) => review.includes("편하게 진료받았어요")))
assert.ok(parsed.some((review) => review.includes("치료 과정이 전반적으로")))
