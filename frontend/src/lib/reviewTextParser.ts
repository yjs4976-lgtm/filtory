const MIN_STANDALONE_REVIEW_LENGTH = 20
const MAX_PARSED_REVIEWS = 30

const EXACT_UI_LINES = new Set([
  "프로필", "팔로우", "반응 남기기", "영수증", "방문일", "펼쳐서 더보기", "더보기",
  "예약 없이 이용", "예약 후 이용", "이용약관", "고객센터", "리뷰운영정책", "신고센터",
  "접기", "표정을 눌러 반응을 남겨 보세요!", "반응 남기기멋져요", "멋져요", "좋아요",
  "도움돼요", "유익해요", "1", "명", "naver", "홈", "리뷰", "사진", "정보",
  "펠로우", "방문자 리뷰", "블로그 리뷰", "저장", "공유", "예약", "전화", "별점",
])

const UI_LINE_PATTERNS = [
  /^[A-Za-z0-9._-]{2,}\*{2,}$/,
  /^(?:사진|리뷰)\s*\d+(?:,\d{3})*(?:\s*(?:사진|리뷰)\s*\d+(?:,\d{3})*)*$/i,
  /^(?=.{1,80}$).*\s리뷰\s*\d+(?:,\d{3})*\s*사진\s*\d+(?:,\d{3})*$/i,
  /^예약\s*(?:후|없이)\s*이용대기\s*시간.*$/i,
  /^.*(?:대표원장.*예약|원장.*\[.*예약.*\]).*$/i,
  /^(?=.{2,30}$)[가-힣A-Za-z0-9\s·&().-]*(?:병원|의원|치과|안과|정형외과|피부과|클리닉|센터)$/i,
  /^방문일.*(?:\d{4}\s*년|번째\s*방문|방문\s*인증|인증\s*수단|영수증)/i,
  /^방문\s*인증\s*수단\s*영수증$/i,
  /^(?:\d+\s*번째\s*)?방문(?:\s*인증\s*수단\s*영수증)?$/i,
  /^(?:별점\s*)?[★☆⭐]\s*(?:[★☆⭐]\s*)*(?:\d(?:\.\d)?)?$/,
  /^\d(?:\.\d)?\s*점$/,
  /^(?:방문\s*)?\d+\s*회$/,
  /^(?:방문일\s*)?\d{2,4}[./-]\d{1,2}[./-]\d{1,2}\.?$/,
  /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\.?$/,
  /^(?:오늘|어제|\d+\s*(?:분|시간|일|주|개월|년)\s*전)$/,
]

const REVIEW_COUNT_METADATA = /리뷰\s*\d+(?:,\d{3})*(?:\s*사진\s*\d+(?:,\d{3})*)?/i
const OWNER_REPLY_MARKER = /^\s*(?:(?:병원\s*측|병원|업체|매장|원장님?|의사|관리자|사장님|클리닉)\s*(?:의|측)?\s*)?(?:답변|답글|댓글)\s*[:：]?|^\s*(?:owner|business|clinic|hospital)\s*(?:reply|response)\s*[:：]?/i
const REVIEW_EXPERIENCE_PATTERN = /(방문|진료|검사|상담|수술|시술|치료|예약|대기|설명|친절|불편|통증|회복|의사|선생님|직원|간호사|비용|가격|시설|추천|만족)/i
const SENTENCE_ENDING_PATTERN = /(다|요|습니다|했어요|좋아요|좋았어요|아파요|친절해요|추천해요|만족해요)(?:[.!?~…\s]|$)/i
const OWNER_REPLY_SIGNALS = [
  /안녕하세요/i,
  /(?:병원|의원|클리닉|센터)(?:입니다|입니다[.!])/i,
  /방문해\s*주셔서\s*감사(?:합니다|드립니다)/i,
  /소중한\s*(?:리뷰|후기)\s*감사(?:합니다|드립니다)/i,
  /앞으로도\s*최선을\s*다하겠습니다/i,
  /만족스러운\s*진료를\s*위해\s*노력하겠습니다/i,
  /저희\s*(?:병원|의원|클리닉|센터)/i,
  /(?:내원|이용)해\s*주셔서/i,
  /(?:고객님|환자분)/i,
]

export function stripOwnerReplyText(content: string) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n")
  const keptLines: string[] = []

  for (const line of lines) {
    if (OWNER_REPLY_MARKER.test(line)) break
    keptLines.push(line)
  }

  return keptLines.join("\n").trim()
}

function isUiOrMetadataLine(line: string) {
  const normalized = line.replace(/\s+/g, " ").trim()
  if (!normalized) return true
  if (EXACT_UI_LINES.has(normalized.toLowerCase())) return true
  return UI_LINE_PATTERNS.some((pattern) => pattern.test(normalized))
}

function isLikelyProfileLine(line: string) {
  const normalized = line.replace(/\s+/g, " ").trim()
  if (normalized.length > 30 || REVIEW_EXPERIENCE_PATTERN.test(normalized) || SENTENCE_ENDING_PATTERN.test(normalized)) {
    return false
  }
  if (/^[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,4}$/.test(normalized)) return true
  return /^[가-힣A-Za-z][가-힣A-Za-z0-9_.-]{1,19}$/.test(normalized)
}

function isReviewBodyCandidate(content: string, lineCount: number) {
  if (content.length < MIN_STANDALONE_REVIEW_LENGTH) return false
  return (
    SENTENCE_ENDING_PATTERN.test(content) ||
    REVIEW_EXPERIENCE_PATTERN.test(content) ||
    (lineCount >= 2 && content.length >= 40)
  )
}

function isLikelyOwnerReplyBlock(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim()
  if (!normalized) return false

  const signalCount = OWNER_REPLY_SIGNALS.reduce(
    (count, pattern) => count + (pattern.test(normalized) ? 1 : 0),
    0
  )
  const greetingWithBusinessIdentity =
    /^안녕하세요[,.!\s]/i.test(normalized) &&
    /(병원|의원|클리닉|센터|입니다|리뷰|진료|노력|감사|좋은\s*하루)/i.test(normalized)

  return greetingWithBusinessIdentity || signalCount >= 2
}

function cleanReviewBlock(lines: string[]) {
  const content = stripOwnerReplyText(lines.join("\n")).trim()
  if (isLikelyOwnerReplyBlock(content)) return ""
  return isReviewBodyCandidate(content, lines.length) ? content : ""
}

export function splitReviewText(value: string) {
  const normalized = value.replace(/\r\n?/g, "\n").trim()
  if (!normalized) return []

  const results: string[] = []
  const paragraphs = normalized.split(/\n\s*\n+/)

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n").map((line) => line.trim())
    let currentLines: string[] = []
    let skippingOwnerReply = false

    const flush = () => {
      const block = cleanReviewBlock(currentLines)
      if (block) results.push(block)
      currentLines = []
    }

    for (const line of lines) {
      if (OWNER_REPLY_MARKER.test(line) || isLikelyOwnerReplyBlock(line)) {
        flush()
        skippingOwnerReply = true
        continue
      }
      if (skippingOwnerReply) {
        if (REVIEW_COUNT_METADATA.test(line)) skippingOwnerReply = false
        continue
      }
      if (isUiOrMetadataLine(line) || isLikelyProfileLine(line) || line.length < 10) {
        flush()
        continue
      }
      currentLines.push(line)
    }
    flush()

    if (results.length >= MAX_PARSED_REVIEWS) break
  }

  return results.slice(0, MAX_PARSED_REVIEWS)
}
