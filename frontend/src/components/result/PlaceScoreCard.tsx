"use client"

import { ScoreCard } from "./ScoreCard"
import { useLanguage } from "@/context/LanguageContext"

export function PlaceScoreCard() {
  const { t } = useLanguage()

  return <ScoreCard label={t.result.placeScore} score={88} />
}
