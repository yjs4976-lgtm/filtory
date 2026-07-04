"use client"

import Link from "next/link"
import { ChevronDown, ChevronRight, ClipboardCheck, CreditCard, FileQuestion, HelpCircle, Lightbulb, MessageCircle, Sparkles, UserRound } from "lucide-react"
import { AppShell } from "@/components/common/AppShell"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { InquiryCategory } from "@/services/inquiryService"
import styles from "@/styles/App.module.css"

const HELP_CATEGORIES: InquiryCategory[] = ["ANALYSIS_RESULT", "REVIEW_INPUT", "ACCOUNT", "PAYMENT", "SUGGESTION", "OTHER"]

export default function HelpCenterPage() {
  const { t } = useLanguage()

  const renderInquiryRow = (category: InquiryCategory) => {
    const Icon = quickIcons[category]
    return (
      <Link
        key={category}
        href={`${ROUTES.HELP_NEW}?category=${category}`}
        className={`${styles.inquiryTypeRow} ${quickStyles[category]}`}
      >
        <span className={styles.inquiryTypeIcon}>
          <Icon className={styles.iconSm} />
        </span>
        <span className={styles.inquiryTypeCopy}>
          <strong>{t.help.categories[category]}</strong>
          <small>{t.help.quickDescriptions[category]}</small>
        </span>
        <ChevronRight className={styles.iconSm} />
      </Link>
    )
  }

  const quickIcons = {
    ANALYSIS_RESULT: ClipboardCheck,
    REVIEW_INPUT: FileQuestion,
    ACCOUNT: UserRound,
    PAYMENT: CreditCard,
    SUGGESTION: Lightbulb,
    OTHER: MessageCircle,
  }
  const quickStyles = {
    ANALYSIS_RESULT: styles.inquiryQuickANALYSIS_RESULT,
    REVIEW_INPUT: styles.inquiryQuickREVIEW_INPUT,
    ACCOUNT: styles.inquiryQuickACCOUNT,
    PAYMENT: styles.inquiryQuickPAYMENT,
    SUGGESTION: styles.inquiryQuickSUGGESTION,
    OTHER: styles.inquiryQuickOTHER,
  }

  return (
    <AppShell title={t.help.title} showBack>
      <div className={styles.helpPageStack}>
        <section className={`${styles.helpHero} ${styles.card}`}>
          <span className={`${styles.iconBox} ${styles.iconLavender}`}>
            <HelpCircle className={styles.iconMd} />
          </span>
          <div className={styles.helpHeroCopy}>
            <h1 className={styles.helpHeroTitle}>{t.help.title}</h1>
            <p className={styles.helpHeroText}>{t.help.subtitle}</p>
          </div>
        </section>

        <section className={styles.helpActionGrid}>
          <Link href={ROUTES.HELP_NEW} className={`${styles.helpActionCard} ${styles.helpActionLavender}`}>
            <span className={styles.helpActionIcon}>
              <MessageCircle className={styles.iconSm} />
            </span>
            <span>
              <strong>{t.help.inquiryNew}</strong>
              <small>{t.help.ctaNewDescription}</small>
            </span>
            <ChevronRight className={styles.iconSm} />
          </Link>
          <Link href={ROUTES.HELP_MY} className={`${styles.helpActionCard} ${styles.helpActionMint}`}>
            <span className={styles.helpActionIcon}>
              <Sparkles className={styles.iconSm} />
            </span>
            <span>
              <strong>{t.help.inquiryMy}</strong>
              <small>{t.help.ctaMyDescription}</small>
            </span>
            <ChevronRight className={styles.iconSm} />
          </Link>
        </section>

        <section className={styles.stackSm}>
          <h2 className={styles.helpSectionTitle}>{t.help.quickTitle}</h2>
          <div className={styles.inquiryTypeList}>
            {HELP_CATEGORIES.map(renderInquiryRow)}
          </div>
        </section>

        <section className={styles.stackSm}>
          <h2 className={styles.helpSectionTitle}>{t.help.faqTitle}</h2>
          <div className={styles.inquiryFaqCard}>
            {t.help.faq.map((item) => (
              <details key={item.question} className={styles.inquiryFaqItem}>
                <summary>
                  <span className={styles.inquiryQuestionIcon}>Q</span>
                  <span>{item.question}</span>
                  <ChevronDown className={styles.iconSm} />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
