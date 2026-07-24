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

const { isShortReviewText, splitReviewText } = cjsModule.exports
const sample = [
  "Sample User A",
  "리뷰 16사진 14",
  "의사 선생님이 설명을 자세히 해주시고 대기 시간도 짧아서 만족했습니다.",
  "방문일4.5.일2099년 4월 5일 일요일1번째 방문인증 수단영수증",
  "반응 남기기",
  "",
  "SampleUserB 리뷰 24 사진 5",
  "검사 전에 과정을 친절하게 안내해 주셔서 편하게 진료받았어요.",
  "병원 답변",
  "소중한 리뷰 감사합니다. 앞으로도 최선을 다하겠습니다.",
  "",
  "SampleUserC",
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

const maskedNaverMetadataSample = `sample****
리뷰 16사진 15
펠로우
예약 후 이용대기 시간 10분 이내
SampleDoctorA가 절차를 차분하게 안내해 주어 이해하기 쉬웠습니다
방문자 리뷰
사진 15
영수증`

const maskedNaverMetadataParsed = splitReviewText(maskedNaverMetadataSample)

assert.deepEqual(maskedNaverMetadataParsed, [
  "SampleDoctorA가 절차를 차분하게 안내해 주어 이해하기 쉬웠습니다",
])

const anonymizedProfileBlocksSample = `프로필
SampleUserA
리뷰 2사진 2
팔로우
방문자리뷰사진
예약 후 이용대기 시간 10분 이내
업무 중 불편함이 생겨 가까운 곳에 방문했어요.
SampleDoctorA에게 상태 설명을 듣고 기본 처치를 받았어요.
대기 시간과 이후 관리 방법도 안내받았습니다.
더보기
반응 남기기
방문일1.2.금2099년 1월 2일 금요일1번째 방문인증 수단영수증
SampleClinic
1.3.토
SampleUserA님, 안녕하세요. SampleClinic입니다.
저희 병원을 찾아 주셔서 감사드립니다.
소중한 후기 작성에 감사드리며 앞으로도 정성을 다하겠습니다.
더보기
프로필
SampleUserB
리뷰 5사진 1
팔로우
예약 없이 이용대기 시간 20분 이내
검사 순서와 예상 비용을 미리 설명받아 준비하기 편했어요.
SampleDoctorB가 질문에 차분히 답해 주었습니다.
반응 남기기
방문일2.3.화2099년 2월 3일 화요일2번째 방문인증 수단영수증
SampleClinic
2.4.수
SampleUserB님, 안녕하세요. SampleClinic입니다.
의료진 모두 더 나은 안내를 위해 정성을 다하겠습니다.
프로필
SampleUserC
리뷰 1
팔로우
치료 뒤 주의사항과 다음 방문 시점을 구체적으로 안내받았습니다.
시설 이용 과정도 무리 없이 진행됐어요.
영수증
방문일3.4.수2099년 3월 4일 수요일1번째 방문인증 수단영수증
SampleClinic
3.5.목
안녕하세요. SampleClinic입니다.
소중한 후기 남겨 주셔서 감사합니다.
프로필
SampleUserD
리뷰 8사진 3
팔로우
[재방문 상담 예약]
필러 시술 과정을 설명받고 빠르게 할 수 있어서 일정 조정이 편했어요.
접기
반응 남기기
방문일4.5.목2099년 4월 5일 목요일2번째 방문인증 수단예약
SampleClinic
4.6.금
아름다운 일상, [ SampleClinic ] 입니다.
고객님께서 만족해 주셨다니 감사드리며 다음 방문에도 정성을 다하겠습니다.
프로필
SampleUserE
리뷰 3사진 1
팔로우
[첫방문 초진 예약]
염증주사 및 아쿠아필 안내를 받고 무리 없이 이용했습니다.
더보기
반응 남기기
방문일5.6.금2099년 5월 6일 금요일1번째 방문인증 수단영수증
SampleClinic
5.7.토
안녕하세요. SampleClinic입니다.
앞으로도 세심한 안내를 위해 노력하겠습니다.`

const anonymizedProfileBlocksParsed = splitReviewText(anonymizedProfileBlocksSample)

assert.equal(anonymizedProfileBlocksParsed.length, 5)
assert.ok(anonymizedProfileBlocksParsed[0].includes("업무 중 불편함이 생겨"))
assert.ok(anonymizedProfileBlocksParsed[1].includes("검사 순서와 예상 비용"))
assert.ok(anonymizedProfileBlocksParsed[2].includes("치료 뒤 주의사항"))
assert.ok(anonymizedProfileBlocksParsed[3].includes("필러 시술"))
assert.ok(anonymizedProfileBlocksParsed[3].includes("빠르게 할 수 있어서"))
assert.ok(anonymizedProfileBlocksParsed[4].includes("염증주사 및 아쿠아필"))
assert.ok(anonymizedProfileBlocksParsed.every((review) => !/SampleUser|SampleClinic|소중한 후기|정성을 다하겠습니다|방문일|영수증/.test(review)))

assert.deepEqual(splitReviewText("좋아요\n친절해요\n만족합니다\n괜찮아요"), [
  "좋아요",
  "친절해요",
  "만족합니다",
  "괜찮아요",
])

for (const review of ["좋아요", "친절해요", "만족합니다", "빠르고 꼼꼼하고 좋아요", "친절하시고 빠르게 할 수 있어서 항상 만족해요"]) {
  assert.equal(isShortReviewText(review), true)
  assert.ok(splitReviewText(review).includes(review))
}
assert.equal(isShortReviewText("가".repeat(40)), true)
assert.equal(isShortReviewText("가".repeat(41)), false)
