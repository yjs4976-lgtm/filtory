"use client"

import { useRouter } from "next/navigation"
import { Bookmark, ChevronRight, Eye, Globe, LogOut, Smile, Sparkles, User } from "lucide-react"
import { BottomNav } from "@/components/common/BottomNav"
import { Header } from "@/components/common/Header"
import { useLanguage } from "@/context/LanguageContext"
import { recentAnalyses } from "@/lib/mockData"
import styles from "@/styles/App.module.css"

const categoryMeta = {
  derma: { icon: Sparkles, box: styles.iconPink },
  eye: { icon: Eye, box: styles.iconLavender },
  dental: { icon: Smile, box: styles.iconMint },
}

function scoreClass(score) {
  if (score >= 75) return styles.scoreGood
  if (score >= 55) return styles.scoreWarn
  return styles.scoreBad
}

export default function MyPage() {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()

  return (
    <div className={styles.page}>
      <Header title={t.mypage.title} showBack />

      <main className={`${styles.main} ${styles.stack}`}>
        <section className={`${styles.card} ${styles.profileCard}`}>
          <span className={styles.profileAvatar}>
            <User className={styles.iconLg} />
          </span>
          <div className={styles.profileInfo}>
            <p className={styles.titleMd}>{t.mypage.profileName}</p>
            <p className={styles.profileEmail}>{t.mypage.profileEmail}</p>
            <p className={styles.mutedText}>{t.mypage.memberSince}</p>
          </div>
        </section>

        <section className={styles.stackSm}>
          <h2 className={styles.titleSm}>{t.mypage.recentTitle}</h2>
          <div className={styles.recordList}>
            {recentAnalyses.map((item) => {
              const meta = categoryMeta[item.category]
              const Icon = meta.icon
              return (
                <button key={item.id} type="button" onClick={() => router.push("/result")} className={styles.recordButton}>
                  <span className={`${styles.iconBoxSmall} ${meta.box}`}>
                    <Icon className={styles.iconMd} />
                  </span>
                  <div className={styles.recordBody}>
                    <p className={styles.recordName}>{item.name[language]}</p>
                    <p className={styles.recordDate}>{item.date}</p>
                  </div>
                  <span className={`${styles.scoreSmall} ${scoreClass(item.score)}`}>{item.score}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className={styles.stackSm}>
          <h2 className={styles.titleSm}>{t.mypage.savedTitle}</h2>
          <button type="button" onClick={() => router.push("/result")} className={styles.savedButton}>
            <span className={`${styles.iconBoxSmall} ${styles.iconCard}`}>
              <Bookmark className={`${styles.iconMd} ${styles.peachText}`} />
            </span>
            <div className={styles.recordBody}>
              <p className={styles.recordName}>{recentAnalyses[0].name[language]}</p>
              <p className={styles.recordDate}>{t.home.trustReliable}</p>
            </div>
            <ChevronRight className={styles.iconSm} />
          </button>
        </section>

        <section className={`${styles.card} ${styles.stackSm}`}>
          <div className={styles.row}>
            <Globe className={`${styles.iconSm} ${styles.iconPrimary}`} />
            <h2 className={styles.titleSm}>{t.mypage.languageTitle}</h2>
          </div>
          <p className={styles.mutedText}>{t.mypage.languageDesc}</p>
          <div className={styles.segmented}>
            {["ko", "en"].map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={[styles.segmentButton, language === lang ? styles.segmentButtonActive : ""].join(" ")}
              >
                {lang === "ko" ? "한국어" : "English"}
              </button>
            ))}
          </div>
        </section>

        <button type="button" className={styles.dangerButton}>
          <LogOut className={styles.iconSm} />
          {t.mypage.logout}
        </button>
      </main>

      <BottomNav />
    </div>
  )
}
