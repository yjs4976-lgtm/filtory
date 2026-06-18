import { FileSearch, Globe2, ShieldCheck } from "lucide-react"
import styles from "@/styles/App.module.css"

const features = [
  { icon: ShieldCheck, title: "리뷰 신뢰도", description: "구체적인 경험과 반복 패턴을 함께 확인합니다." },
  { icon: FileSearch, title: "플레이스 완성도", description: "병원 정보가 충분히 채워져 있는지 살펴봅니다." },
  { icon: Globe2, title: "외국인 접근성", description: "영어 정보와 지도 접근성을 참고합니다." },
]

export function FeatureCards() {
  return (
    <section className={styles.stackSm}>
      {features.map(({ icon: Icon, title, description }) => (
        <article key={title} className={`${styles.card} ${styles.stackSm}`}>
          <div className={styles.row}>
            <Icon className={styles.iconSm} />
            <h2 className={styles.titleSm}>{title}</h2>
          </div>
          <p className={styles.mutedText}>{description}</p>
        </article>
      ))}
    </section>
  )
}
