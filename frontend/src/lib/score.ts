export function getScoreTone(score: number) {
  if (score >= 75) return "good"
  if (score >= 55) return "warn"
  return "bad"
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, score))
}
