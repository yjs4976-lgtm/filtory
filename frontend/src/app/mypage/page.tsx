import Link from "next/link"
import { ChevronRight, FileText, ShieldCheck, UserPen } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { MyPageUserCard } from "@/components/mypage/MyPageUserCard"
import { MyRecentAnalysis } from "@/components/mypage/MyRecentAnalysis"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export default function MyPage() {
  const menuItems = [
    { href: ROUTES.MYPAGE_HISTORY, label: "내 분석 기록", icon: FileText },
    { href: ROUTES.MYPAGE_PROFILE, label: "회원 정보 수정", icon: UserPen },
    { href: ROUTES.MYPAGE_WITHDRAWAL, label: "회원 탈퇴", icon: ShieldCheck },
  ]

  return (
    <ProtectedRoute>
      <AppShell title="마이페이지" showBack>
        <MyPageUserCard />

        <section className={styles.stackSm}>
          <h2 className={styles.titleSm}>나의 활동</h2>

          <div className={styles.recordList}>
            {menuItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={styles.recordButton}>
                <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
                  <Icon className={styles.iconMd} />
                </span>
                <span className={styles.recordBody}>
                  <span className={styles.recordName}>{label}</span>
                </span>
                <ChevronRight className={styles.iconSm} />
              </Link>
            ))}
          </div>
        </section>

        <MyRecentAnalysis />
      </AppShell>
    </ProtectedRoute>
  )
}
