"use client"

import Link from "next/link"
import { LogOut, User } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function ProfileCard() {
  const { user, logout, isLoading } = useAuth()

  if (isLoading) {
    return (
      <section className={`${styles.card} ${styles.profileCard}`}>
        <span className={styles.profileAvatar}>
          <User className={styles.iconLg} />
        </span>
        <div className={styles.profileInfo}>
          <p className={styles.titleMd}>사용자 정보를 확인 중이에요</p>
          <p className={styles.profileEmail}>잠시만 기다려 주세요.</p>
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.profileCard}>
          <span className={styles.profileAvatar}>
            <User className={styles.iconLg} />
          </span>
          <div className={styles.profileInfo}>
            <p className={styles.titleMd}>로그인이 필요해요</p>
            <p className={styles.profileEmail}>분석 기록과 계정 설정을 보려면 로그인해 주세요.</p>
          </div>
        </div>

        <Link href={ROUTES.LOGIN} className={styles.primaryButton}>
          로그인하기
        </Link>
      </section>
    )
  }

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.profileCard}>
        <span className={styles.profileAvatar}>
          <User className={styles.iconLg} />
        </span>
        <div className={styles.profileInfo}>
          <p className={styles.titleMd}>{user.name}님</p>
          <p className={styles.profileEmail}>{user.email}</p>
          <p className={styles.mutedText}>
            {user.provider || "local"} / {user.status}
          </p>
        </div>
      </div>

      <div className={styles.stackSm}>
        <Link href={ROUTES.MYPAGE_PROFILE} className={styles.secondaryButton}>
          회원 정보 수정
        </Link>

        <button type="button" className={styles.dangerButton} onClick={logout}>
          <LogOut className={styles.iconSm} />
          로그아웃
        </button>
      </div>
    </section>
  )
}
