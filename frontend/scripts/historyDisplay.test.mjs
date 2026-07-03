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

  const source = fs.readFileSync(resolvedPath, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
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

  const executeModule = new Function("require", "module", "exports", output)
  executeModule(localRequire, cjsModule, cjsModule.exports)

  return cjsModule.exports
}

const {
  extractRegionLabelFromAddress,
  formatHistoryRegionLabel,
  getEnglishRegionLabelFromKorean,
  getHistoryHospitalName,
  getHistoryMetaText,
  getHistoryRegionLabel,
} = loadTypeScriptModule(path.join(projectRoot, "src/lib/historyDisplay.ts"))

assert.equal(
  extractRegionLabelFromAddress("서울특별시 강남구 테헤란로 1"),
  "서울 강남구"
)

assert.equal(
  extractRegionLabelFromAddress("경기도 성남시 분당구 판교로 1"),
  "경기 성남시 분당구"
)

assert.equal(
  getEnglishRegionLabelFromKorean("서울 강남구"),
  "Gangnam-gu, Seoul"
)

assert.equal(
  formatHistoryRegionLabel("Seoul Gangnam-gu", "en"),
  "Gangnam-gu, Seoul"
)

assert.equal(
  formatHistoryRegionLabel("Gyeonggi-do Suwon-si Yeongtong-gu", "en"),
  "Suwon-si, Yeongtong-gu, Gyeonggi-do"
)

assert.equal(
  getHistoryRegionLabel(
    {
      regionProvinceCode: "SEOUL",
      regionDistrictCode: "GANGNAM_GU",
    },
    "ko"
  ),
  "서울 강남구"
)

assert.equal(
  getHistoryHospitalName(
    {
      hospitalNameKo: "예시피부과",
      hospitalNameEn: "Example Clinic",
    },
    "en"
  ),
  "Example Clinic"
)

assert.equal(
  getHistoryHospitalName(
    {
      hospitalNameKo: "예시피부과",
    },
    "en"
  ),
  "예시피부과"
)

assert.equal(
  getHistoryMetaText(
    {
      categoryKoLabel: "피부과",
      regionKoLabel: "서울 강남구",
      roadAddress: "서울 강남구 테헤란로 1",
    },
    "ko",
    "피부과"
  ),
  "피부과 · 서울 강남구"
)

assert.equal(
  getHistoryMetaText(
    {
      categoryKoLabel: "피부과",
      roadAddress: "서울 강남구 테헤란로 1",
    },
    "ko",
    "피부과"
  ),
  "피부과 · 서울 강남구"
)

assert.equal(
  getHistoryMetaText(
    {
      hospitalNameKo: "CNP차앤박피부과 분당서현점",
      categoryKoLabel: "피부과",
    },
    "ko",
    "피부과"
  ),
  "피부과 · 분당서현점"
)

assert.equal(
  getHistoryMetaText(
    {
      hospitalNameKo: "CNP차앤박피부과 분당서현점",
      categoryEnLabel: "Skin Clinic",
    },
    "en",
    "Skin Clinic"
  ),
  "Skin Clinic · Bundang Seohyeon"
)

assert.equal(
  getHistoryMetaText(
    {
      hospitalNameKo: "플란치과의원 경기수원점",
      categoryEnLabel: "Dental Clinic",
    },
    "en",
    "Dental Clinic"
  ),
  "Dental Clinic · Gyeonggi Suwon"
)

assert.equal(
  getHistoryRegionLabel({ region: "지역 정보 없음" }, "ko"),
  ""
)
