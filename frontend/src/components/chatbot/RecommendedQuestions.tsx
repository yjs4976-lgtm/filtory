"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function RecommendedQuestions({ onSelect }: { onSelect: (question: string) => void }) {
  const { t } = useLanguage()

  return (
    <div className={styles.exampleList}>
      {t.chatbot.examples.map((question) => (
        <button key={question} type="button" onClick={() => onSelect(question)} className={styles.exampleButton}>
          {question}
        </button>
      ))}
    </div>
  )
}
