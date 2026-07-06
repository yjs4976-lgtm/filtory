"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function RecommendedQuestions({
  questions,
  onSelect,
}: {
  questions?: string[]
  onSelect: (question: string) => void
}) {
  const { t } = useLanguage()
  const visibleQuestions = questions?.length ? questions : t.chatbot.examples

  return (
    <div className={styles.exampleList}>
      {visibleQuestions.map((question) => (
        <button key={question} type="button" onClick={() => onSelect(question)} className={styles.exampleButton}>
          {question}
        </button>
      ))}
    </div>
  )
}
