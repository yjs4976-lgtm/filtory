"use client"

import { useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import styles from "@/styles/App.module.css"

interface SectionPagerProps {
  sections: Array<{
    id: string
    content: React.ReactNode
  }>
  previousLabel?: string
  nextLabel?: string
}

export function SectionPager({ sections, previousLabel = "이전", nextLabel = "다음" }: SectionPagerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pageParam = Number(searchParams.get("page"))
  const [index, setIndex] = useState(() => Math.max(0, Math.min(sections.length - 1, (pageParam || 1) - 1)))
  const touchStartX = useRef<number | null>(null)
  const total = sections.length
  const isMyPagePager = pathname === "/mypage"
  const activeIndex = pathname === "/mypage" && pageParam
    ? Math.max(0, Math.min(total - 1, pageParam - 1))
    : index
  const current = sections[activeIndex]

  if (!current) return null

  const moveTo = (nextIndex: number) => {
    const safeIndex = Math.max(0, Math.min(total - 1, nextIndex))
    setIndex(safeIndex)
    if (pathname === "/mypage") {
      const params = new URLSearchParams(searchParams.toString())
      params.set("page", String(safeIndex + 1))
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }

  const handleTouchEnd = (clientX: number) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - clientX
    touchStartX.current = null
    if (Math.abs(diff) < 42) return
    moveTo(diff > 0 ? activeIndex + 1 : activeIndex - 1)
  }

  return (
    <section
      className={`${styles.sectionPager} ${isMyPagePager ? styles.myPagePager : ""}`}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      <div className={styles.sectionPagerBody}>
        {sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            className={sectionIndex === activeIndex ? styles.sectionPagerPaneActive : styles.sectionPagerPane}
            aria-hidden={sectionIndex !== activeIndex}
          >
            {section.content}
          </div>
        ))}
      </div>
      {total > 1 && (
        <div className={styles.paginationControls}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={activeIndex === 0}
            onClick={() => moveTo(activeIndex - 1)}
          >
            <span aria-hidden="true">&lt;</span>
            {previousLabel}
          </button>
          <span className={styles.pageIndicator}>
            {activeIndex + 1}/{total}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            disabled={activeIndex >= total - 1}
            onClick={() => moveTo(activeIndex + 1)}
          >
            {nextLabel}
            <span aria-hidden="true">&gt;</span>
          </button>
        </div>
      )}
    </section>
  )
}
