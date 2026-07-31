export const USAGE_RESET_TIMEZONE = "Asia/Seoul"
export const USAGE_RESET_DAY = 1

type SeoulDateParts = { year: number; month: number; day: number }
export type MonthlyUsagePeriod = { periodKey: string; usagePeriodStart: string; usagePeriodEnd: string; nextResetAt: string }

const seoulFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: USAGE_RESET_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" })

export function getSeoulDateParts(now: Date = new Date()): SeoulDateParts {
  const parts = Object.fromEntries(seoulFormatter.formatToParts(now).map((part) => [part.type, part.value]))
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) }
}

export function getSeoulCalendarDateKey(now: Date = new Date()) {
  const { year, month, day } = getSeoulDateParts(now)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function getMonthlyUsagePeriod(now: Date = new Date()): MonthlyUsagePeriod {
  const { year, month } = getSeoulDateParts(now)
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const two = (value: number) => String(value).padStart(2, "0")
  return {
    periodKey: `${year}-${two(month)}`,
    usagePeriodStart: `${year}-${two(month)}-01T00:00:00+09:00`,
    usagePeriodEnd: `${year}-${two(month)}-${two(lastDay)}T23:59:59+09:00`,
    nextResetAt: `${nextYear}-${two(nextMonth)}-01T00:00:00+09:00`,
  }
}

export function getNextMonthlyResetAt(now: Date = new Date()) { return getMonthlyUsagePeriod(now).nextResetAt }
export function hasMonthlyUsageReset(storedPeriodKey: string, now: Date = new Date()) { return storedPeriodKey !== getMonthlyUsagePeriod(now).periodKey }

export function formatKoreanResetDate(nextResetAt: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(nextResetAt)
  if (!match) return ""
  return `${Number(match[1])}년 ${Number(match[2])}월 ${Number(match[3])}일`
}

// TODO: Replace the mock clock with usagePeriodStart, usagePeriodEnd and nextResetAt from the server allowance response.
