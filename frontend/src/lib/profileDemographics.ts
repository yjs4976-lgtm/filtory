import type { AgeGroup, Gender } from "./types"

export function parseDateOnly(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  const probe = new Date(year, month - 1, day)
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) return null
  return { year, month, day }
}

export function calculateInternationalAge(dateOfBirth: string, today = new Date()): number | null {
  const birth = parseDateOnly(dateOfBirth)
  if (!birth) return null
  const current = { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() }
  if (birth.year > current.year || (birth.year === current.year && (birth.month > current.month || (birth.month === current.month && birth.day > current.day)))) return null
  let birthdayMonth = birth.month
  let birthdayDay = birth.day
  if (birth.month === 2 && birth.day === 29 && !isLeapYear(current.year)) { birthdayMonth = 3; birthdayDay = 1 }
  let age = current.year - birth.year
  if (current.month < birthdayMonth || (current.month === birthdayMonth && current.day < birthdayDay)) age -= 1
  return age < 0 ? null : age
}

export function getAgeGroup(age: number | null): AgeGroup | null {
  if (age === null || age < 0 || !Number.isFinite(age)) return null
  if (age < 10) return "UNDER_TEN"
  if (age < 20) return "TEENS"
  if (age < 30) return "TWENTIES"
  if (age < 40) return "THIRTIES"
  if (age < 50) return "FORTIES"
  if (age < 60) return "FIFTIES"
  return "SIXTIES_OR_MORE"
}

export function normalizeOptionalDate(value?: string | null, today = new Date()) {
  if (!value) return null
  return calculateInternationalAge(value, today) === null ? null : value
}

export function normalizeGender(value?: string | null): Gender | null {
  return value === "FEMALE" || value === "MALE" || value === "OTHER" || value === "PREFER_NOT_TO_SAY" ? value : null
}

function isLeapYear(year: number) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) }
