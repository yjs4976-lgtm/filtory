const MIN_STANDALONE_REVIEW_LENGTH = 20
const MAX_PARSED_REVIEWS = 100

const EXACT_UI_LINES = new Set([
  "프로필", "팔로우", "반응 남기기", "영수증", "방문일", "펼쳐서 더보기", "더보기",
  "예약 없이 이용", "예약 후 이용", "이용약관", "고객센터", "리뷰운영정책", "신고센터",
  "naver", "홈", "리뷰", "사진", "정보",
])

const UI_LINE_PATTERNS = [
  /^(?:사진|리뷰)\s*\d+(?:,\d{3})*$/i,
  /^(?:별점\s*)?[★☆⭐]\s*(?:[★☆⭐]\s*)*(?:\d(?:\.\d)?)?$/,
  /^\d(?:\.\d)?\s*점$/,
  /^(?:방문\s*)?\d+\s*회$/,
  /^(?:방문일\s*)?\d{2,4}[./-]\d{1,2}[./-]\d{1,2}\.?$/,
  /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\.?$/,
  /^(?:오늘|어제|\d+\s*(?:분|시간|일|주|개월|년)\s*전)$/,
]

const OWNER_REPLY_MARKER = /^\s*(병원\s*측|병원|업체|매장|원장님?|의사|관리자|사장님|클리닉)\s*(?:의|측)?\s*(?:답변|답글|댓글)\s*[:：]?\s*$|^\s*(?:답변|답글)\s*[:：]\s*(?:병원|업체|관리자|사장님|클리닉)\s*$|^\s*(?:owner|business|clinic|hospital)\s*(?:reply|response)\s*[:：]?\s*$/i

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

function cleanReviewBlock(lines: string[]) {
  const content = stripOwnerReplyText(lines.join("\n")).trim()
  return content.length >= MIN_STANDALONE_REVIEW_LENGTH ? content : ""
}

export function splitReviewText(value: string) {
  const normalized = value.replace(/\r\n?/g, "\n").trim()
  if (!normalized) return []

  const results: string[] = []
  const paragraphs = normalized.split(/\n\s*\n+/)

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n").map((line) => line.trim())
    let currentLines: string[] = []

    const flush = () => {
      const block = cleanReviewBlock(currentLines)
      if (block) results.push(block)
      currentLines = []
    }

    for (const line of lines) {
      if (isUiOrMetadataLine(line) || line.length < 10) {
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
