import styles from "@/styles/App.module.css"

export function AnalyzeProgress({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <ol className={styles.stepProgress}>
      {steps.map((label, index) => (
        <li key={label} className={index <= currentStep ? styles.stepActive : ""}>
          <span>{index + 1}</span>
          <strong>{label}</strong>
        </li>
      ))}
    </ol>
  )
}
