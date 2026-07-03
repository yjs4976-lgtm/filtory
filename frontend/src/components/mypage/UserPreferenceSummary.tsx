import type { UserInsight } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import styles from "@/styles/App.module.css";

interface UserPreferenceSummaryProps {
  insight: UserInsight;
}

export function UserPreferenceSummary({ insight }: UserPreferenceSummaryProps) {
  const { t } = useLanguage();
  const factorLabels: Record<string, string> = {
    "리뷰 신뢰도": t.mypage.compareMetricTrust,
    "외국인 방문 편의도": t.mypage.compareMetricGlobal,
    "광고 의심도": t.mypage.compareMetricAd,
  };

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.mypage.insightCriteriaTitle}</h2>
      <div className={styles.socialProviderGrid}>
        {insight.mainDecisionFactors.map((factor) => (
          <span key={factor} className={styles.connectedPill}>
            {factorLabels[factor] ?? factor}
          </span>
        ))}
      </div>
      <p className={styles.bodyText}>{t.mypage.insightCriteriaDescription}</p>
    </section>
  );
}
