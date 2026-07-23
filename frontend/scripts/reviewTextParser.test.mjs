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
  "Sample User A",
  "리뷰 16사진 14",
  "의사 선생님이 설명을 자세히 해주시고 대기 시간도 짧아서 만족했습니다.",
  "방문일7.20.월2026년 7월 20일 월요일1번째 방문인증 수단영수증",
  "반응 남기기",
  "",
  "SampleUserD 리뷰 24 사진 5",
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

const ownerReplyMixedSample = [
  "시설도 깔끔하고 직원분들도 친절해서 기분 좋게 다녀왔어요.",
  "",
  "안녕하세요, 샘플안과의원입니다. 방문해 주셔서 감사합니다. 앞으로도 만족스러운 진료를 위해 노력하겠습니다.",
  "",
  "검사 전에 설명을 자세히 해주셔서 편하게 진료받았어요.",
  "",
  "소중한 리뷰 감사드립니다. 저희 병원을 이용해 주셔서 감사합니다.",
  "",
  "시술 효과가 만족스러웠고 회복 과정도 괜찮았습니다.",
  "",
  "안녕하세요, 샘플안과입니다. 환자분의 방문에 감사드리며 앞으로도 최선을 다하겠습니다.",
].join("\n")

const ownerReplyFiltered = splitReviewText(ownerReplyMixedSample)

assert.equal(ownerReplyFiltered.length, 3)
assert.deepEqual(ownerReplyFiltered, [
  "시설도 깔끔하고 직원분들도 친절해서 기분 좋게 다녀왔어요.",
  "검사 전에 설명을 자세히 해주셔서 편하게 진료받았어요.",
  "시술 효과가 만족스러웠고 회복 과정도 괜찮았습니다.",
])

const reviewWithThanks = splitReviewText("검사 결과를 자세히 설명해 주셔서 안심됐습니다. 감사합니다.")
assert.equal(reviewWithThanks.length, 1)

const anonymizedNaverSample = `예약 후 이용대기 시간 바로 입장
예약 후 대기 없이 바로 진료 받았어요.
의사선생님도, 간호사분들도
친절히 안내해주셔서
마음 편히 진료 받았어요.
접기
반응 남기기
방문일7.10.금2026년 7월 10일 금요일2번째 방문인증 수단영수증
샘플정형외과의원
7.15.수
안녕하세요. userA님 리뷰에 힘이 납니다. 더 좋은 진료할 수 있도록 노력하겠습니다. 감사합니다.
프로필
SampleUserB
리뷰 56사진 75
팔로우
김샘플 대표원장 [신환 예약]
예약 후 이용대기 시간 바로 입장
정형외과 올일 있으면 오는 곳입니다. 원장 선생님 너무 친절하시고 궁금한거 잘 설명해주셔요. 물리치료도 잘 받았습니다! 병원도 쾌적하니 좋아요~~
반응 남기기
방문일7.10.금2026년 7월 10일 금요일1번째 방문인증 수단예약
샘플정형외과의원
7.15.수
안녕하세요. SampleUserB님 소중한 리뷰 감사합니다. 항상 좋은 진료할 수 있도록 노력하겠습니다.
프로필
SampleUserC
리뷰 13사진 2
팔로우
예약 없이 이용대기 시간 10분 이내
처음 방문했는데 의사샘이 친절하고 물리치료가 좋아요~
물리치료가 마음에 들어요
다음에 방문할게요.
표정을 눌러 반응을 남겨 보세요!
반응 남기기멋져요
1
명
방문일7.9.목2026년 7월 9일 목요일1번째 방문인증 수단영수증
샘플정형외과의원
7.15.수
안녕하세요. SampleUserC님 소중한 리뷰 덕분에 힘이 나네요. 더 좋은 진료할 수 있도록 노력하겠습니다. 좋은 하루 되세요`

const anonymizedNaverParsed = splitReviewText(anonymizedNaverSample)
const excludedNaverPhrases = [
  "안녕하세요", "소중한 리뷰", "노력하겠습니다", "좋은 하루", "접기", "반응 남기기",
  "표정을 눌러", "방문일", "영수증", "대표원장", "예약 후 이용대기 시간 바로 입장",
  "예약 없이 이용대기 시간 10분 이내", "샘플정형외과의원",
]

assert.equal(anonymizedNaverParsed.length, 3)
assert.ok(anonymizedNaverParsed.every((review) => excludedNaverPhrases.every((phrase) => !review.includes(phrase))))
assert.ok(anonymizedNaverParsed.some((review) => review.includes("예약 후 대기 없이 바로 진료 받았어요")))
assert.ok(anonymizedNaverParsed.some((review) => review.includes("정형외과 올일 있으면 오는 곳입니다")))
assert.ok(anonymizedNaverParsed.some((review) => review.includes("처음 방문했는데 의사샘이 친절하고")))
