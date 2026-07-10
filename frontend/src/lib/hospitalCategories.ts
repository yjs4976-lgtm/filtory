import type { HospitalCategory } from "./types"

export const HOSPITAL_CATEGORIES = [
  { value: "dermatology", frontendValue: "derma", labelKo: "피부과", labelEn: "Dermatology" },
  { value: "ophthalmology", frontendValue: "eye", labelKo: "안과", labelEn: "Ophthalmology" },
  { value: "dentistry", frontendValue: "dental", labelKo: "치과", labelEn: "Dentistry" },
  { value: "orthopedics", frontendValue: "orthopedics", labelKo: "정형외과", labelEn: "Orthopedics" },
] as const satisfies ReadonlyArray<{ value: string; frontendValue: HospitalCategory; labelKo: string; labelEn: string }>

export function hospitalCategoryLabel(category: HospitalCategory, language: "ko" | "en") {
  const item = HOSPITAL_CATEGORIES.find((candidate) => candidate.frontendValue === category)
  return item ? (language === "ko" ? item.labelKo : item.labelEn) : category
}
