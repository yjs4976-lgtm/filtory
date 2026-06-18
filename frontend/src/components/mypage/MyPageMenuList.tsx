import Link from "next/link"
import { ChevronRight, FileText, KeyRound, ShieldCheck, UserPen } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

const menuItems = [
  { href: ROUTES.MYPAGE_PROFILE, label: "회원정보 수정", icon: UserPen },
  { href: ROUTES.HISTORY, label: "내 분석 기록", icon: FileText },
  { href: ROUTES.MYPAGE_PROFILE, label: "비밀번호 변경", icon: KeyRound },
  { href: ROUTES.MYPAGE_WITHDRAWAL, label: "회원 탈퇴", icon: ShieldCheck, danger: true },
]

export function MyPageMenuList() {
  return (
    <section className={styles.stackSm}>
      <h2 className={styles.titleSm}>계정 관리</h2>
      <div className={styles.recordList}>
        {menuItems.map(({ href, label, icon: Icon, danger }) => (
          <Link key={label} href={href} className={styles.recordButton}>
            <span className={`${styles.iconBoxSmall} ${danger ? styles.iconPink : styles.iconLavender}`}>
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
  )
}
