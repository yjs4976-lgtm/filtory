"use client"

type Props = {
  score: number
  size?: number
  label?: string
}

function colorForScore(score: number) {
  if (score >= 75) return "#BDEECF" // mint
  if (score >= 55) return "#FFD7B5" // peach
  return "#FFB6C9" // pink
}

export function ScoreCircle({ score, size = 140, label }: Props) {
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference
  const color = colorForScore(clamped)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
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
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-foreground">{clamped}</span>
        {label && <span className="mt-0.5 text-xs font-medium text-graypurple">{label}</span>}
      </div>
    </div>
  )
}
