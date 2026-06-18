import type { UserInsight } from "@/lib/types";
import styles from "@/styles/App.module.css";

interface UserPreferenceSummaryProps {
  insight: UserInsight;
}

export function UserPreferenceSummary({ insight }: UserPreferenceSummaryProps) {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>내가 자주 보는 기준</h2>
      <div className={styles.socialProviderGrid}>
        {insight.mainDecisionFactors.map((factor) => (
          <span key={factor} className={styles.connectedPill}>
            {factor}
          </span>
        ))}
      </div>
      <p className={styles.bodyText}>
        최근 저장한 병원은 광고 의심도가 낮은 편이에요.
      </p>
    </section>
  );
}
