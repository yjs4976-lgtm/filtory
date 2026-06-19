"use client";

import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";
import styles from "@/styles/App.module.css";

function maskEmail(email?: string) {
  if (!email) return "";

  const [name, domain] = email.split("@");
  if (!domain) return email;

  const visible = name.slice(0, 2);

  return `${visible}${"*".repeat(Math.max(4, name.length - visible.length))}@${domain}`;
}

function formatDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function MyPageUserCard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const displayName = user.nickname || user.name || "Filtory";
  const joinedAt = user.createdAt
    ? formatDate(user.createdAt)
    : t.mypage.fallbackMemberSince;
  const realName = user.name || displayName;
  const maskedEmail = maskEmail(user.email) || t.mypage.maskedEmailFallback;

  return (
    <section className={`${styles.memberHeroCard} ${styles.stackSm}`}>
      <div className={styles.profileCard}>
        <span className={styles.memberAvatar}>
          {user.profileImageUrl ? (
            <span
              className={styles.avatarImage}
              style={{ backgroundImage: `url(${user.profileImageUrl})` }}
              aria-hidden="true"
            />
          ) : (
            <UserRound className={styles.iconLg} />
          )}
        </span>

        <div className={styles.profileInfo}>
          <p className={styles.memberEyebrow}>MY FILTORY</p>
          <h1 className={styles.memberName}>{displayName}</h1>
          <p className={styles.profileEmail}>
            {realName} · {maskedEmail}
          </p>
        </div>
      </div>

      <div className={styles.memberInfoPill}>
        <CalendarDays className={styles.iconSm} />
        <span>
          {t.mypage.memberSince} {joinedAt}
        </span>
      </div>

      <div className={styles.profileHeroActions}>
        <Link href={ROUTES.MYPAGE_PROFILE} className={styles.secondaryButton}>
          {t.mypage.profileEdit}
        </Link>
      </div>
    </section>
  );
}
