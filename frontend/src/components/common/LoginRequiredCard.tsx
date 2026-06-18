"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/routes";
import styles from "@/styles/App.module.css";

interface LoginRequiredCardProps {
  title?: string;
  description?: string;
  showSignup?: boolean;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function LoginRequiredCard({
  title,
  description,
  showSignup = true,
  secondaryHref = ROUTES.ANALYZE,
  secondaryLabel,
}: LoginRequiredCardProps) {
  const { t } = useLanguage();
  const displayTitle = title ?? t.home.loginRequiredTitle;
  const displayDescription = description ?? t.home.loginRequiredDescription;
  const displaySecondaryLabel = secondaryLabel ?? t.home.analyzeFirst;

  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBox} ${styles.iconLavender}`}>
        <LockKeyhole className={styles.iconMd} />
      </span>
      <div className={styles.stackSm}>
        <h2 className={styles.titleMd}>{displayTitle}</h2>
        <p className={styles.bodyText}>{displayDescription}</p>
      </div>
      <div className={styles.actionRow}>
        <Link href={ROUTES.LOGIN} className={styles.primaryButton}>
          {t.common.login}
        </Link>
        {showSignup ? (
          <Link href={ROUTES.SIGNUP} className={styles.secondaryButton}>
            {t.common.signup}
          </Link>
        ) : (
          <Link href={secondaryHref} className={styles.secondaryButton}>
            {displaySecondaryLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
