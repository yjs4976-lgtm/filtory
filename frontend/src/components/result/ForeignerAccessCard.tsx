"use client"

import { ScoreCard } from "./ScoreCard"
import { useLanguage } from "@/context/LanguageContext"

export function ForeignerAccessCard() {
  const { t } = useLanguage()

  return <ScoreCard label={t.result.foreignerScore} score={72} />
}
