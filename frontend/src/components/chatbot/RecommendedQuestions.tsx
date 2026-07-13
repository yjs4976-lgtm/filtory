"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function RecommendedQuestions({
  questions,
  onSelect,
  expanded = true,
  onToggle,
}: {
  questions: string[]
  onSelect: (question: string) => void
  expanded?: boolean
  onToggle?: () => void
}) {
  const { t } = useLanguage()
  if (questions.length === 0) return null

  if (!expanded) {
    return (
      <div className={styles.exampleListCollapsed}>
        <button type="button" className={styles.smallPillButton} onClick={onToggle}>
          {t.chatbot.showSuggestions}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.exampleBlock}>
      <div className={styles.exampleHeader}>
        <span>{t.chatbot.suggestionTitle}</span>
        {onToggle && (
          <button type="button" className={styles.exampleToggleButton} onClick={onToggle}>
            {t.chatbot.hideSuggestions}
          </button>
        )}
      </div>
      <div className={styles.exampleList}>
        {questions.map((question) => (
          <button key={question} type="button" onClick={() => onSelect(question)} className={styles.exampleButton}>
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}
