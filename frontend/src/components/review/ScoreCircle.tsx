"use client"

import styles from "@/styles/App.module.css"

function colorForScore(score) {
  if (score >= 75) return "#BDEECF"
  if (score >= 55) return "#FFD7B5"
  return "#FFB6C9"
}

export function ScoreCircle({ score, size = 140, label }) {
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference
  const color = colorForScore(clamped)

  return (
    <div className={styles.scoreCircle} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.scoreSvg}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1E8DD" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={styles.strokeAnimate}
        />
      </svg>
      <div className={styles.scoreCircleValue}>
        <span className={styles.scoreNumber}>{clamped}</span>
        {label && <span className={styles.scoreLabel}>{label}</span>}
      </div>
    </div>
  )
}
