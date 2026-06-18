"use client";

import Link from "next/link";
import { CalendarDays, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/lib/routes";
import styles from "@/styles/App.module.css";

export function MyPageUserCard() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  if (!user) return null;

  const joinedAt = user.createdAt ? user.createdAt.slice(0, 10) : "Filtory 회원";
  const displayName = user.nickname || user.name || "Filtory 사용자";

  return (
    <section className={`${styles.memberHeroCard} ${styles.stackSm}`}>
      <div className={styles.profileCard}>
        <span className={styles.memberAvatar}>
          <UserRound className={styles.iconLg} />
        </span>
        <div className={styles.profileInfo}>
          <p className={styles.memberEyebrow}>MY FILTORY</p>
          <h1 className={styles.memberName}>{displayName}님</h1>
          {user.email && <p className={styles.profileEmail}>{user.email}</p>}
        </div>
      </div>

      <div className={styles.memberInfoPill}>
        <CalendarDays className={styles.iconSm} />
        <span>{joinedAt}</span>
      </div>

      <div className={styles.memberActionGrid}>
        <Link href={ROUTES.MYPAGE_PROFILE} className={styles.secondaryButton}>
          회원정보 수정
        </Link>
        <Link href={ROUTES.MYPAGE_WITHDRAWAL} className={styles.dangerButton}>
          회원 탈퇴
        </Link>
      </div>

      <button
        type="button"
        className={styles.textButton}
        onClick={async () => {
          await logout();
          showToast({
            title: "로그아웃되었습니다.",
            tone: "info",
          });
        }}
      >
        <LogOut className={styles.iconSm} />
        로그아웃
      </button>
    </section>
  );
}
