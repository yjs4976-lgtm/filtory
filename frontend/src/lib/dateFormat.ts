import type { Language } from "./types"

function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function formatDisplayDate(value?: string, language: Language = "ko", includeTime = false) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  if (language === "ko") {
    const base = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
    return includeTime ? `${base} ${pad(date.getHours())}:${pad(date.getMinutes())}` : base
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date)
}
