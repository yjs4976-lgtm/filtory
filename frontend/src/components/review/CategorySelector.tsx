"use client"

import { Eye, Sparkles } from "lucide-react"
import { ToothIcon } from "@/components/common/ToothIcon"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

const meta = {
  derma: { icon: Sparkles, box: styles.iconPink },
  eye: { icon: Eye, box: styles.iconLavender },
  dental: { icon: ToothIcon, box: styles.iconMint },
}

export function CategorySelector({ selected, onSelect, variant = "grid" }) {
  const { t } = useLanguage()
  const items = [
    { key: "derma", label: t.categories.derma, desc: t.categories.dermaDesc },
    { key: "eye", label: t.categories.eye, desc: t.categories.eyeDesc },
    { key: "dental", label: t.categories.dental, desc: t.categories.dentalDesc },
  ]
  const wrapperClass = variant === "pills" ? styles.categoryPills : styles.categoryGrid

  return (
    <div className={wrapperClass}>
      {items.map(({ key, label, desc }) => {
        const itemMeta = meta[key]
        const Icon = itemMeta.icon
        const active = selected === key
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(key)}
            className={[styles.categoryButton, active ? styles.categoryActive : ""].join(" ")}
          >
            <span className={`${styles.iconBox} ${itemMeta.box}`}>
              <Icon className={variant === "pills" ? styles.iconSm : styles.iconLg} />
            </span>
            <span className={styles.categoryName}>{label}</span>
            {variant !== "pills" && <span className={styles.categoryDesc}>{desc}</span>}
          </button>
        )
      })}
    </div>
  )
}
