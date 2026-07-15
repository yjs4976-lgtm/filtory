import type { HospitalCategory } from "./types"
import policy from "../../../shared/filtory_policy.json"

export const HOSPITAL_CATEGORIES = policy.supportedDepartments as ReadonlyArray<{ value: string; frontendValue: HospitalCategory; labelKo: string; labelEn: string }>

export function hospitalCategoryLabel(category: HospitalCategory, language: "ko" | "en") {
  const item = HOSPITAL_CATEGORIES.find((candidate) => candidate.frontendValue === category)
  return item ? (language === "ko" ? item.labelKo : item.labelEn) : category
}
