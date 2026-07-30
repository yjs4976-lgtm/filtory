"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, X } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import { noticeService, selectActiveNotice, type NoticeSummary } from "@/services/noticeService"
import styles from "@/styles/App.module.css"

export function NoticeBar() {
  const [items, setItems] = useState<NoticeSummary[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [transitionKey, setTransitionKey] = useState(0)

  useEffect(() => {
    let alive = true
    noticeService.list(1, 10)
      .then((list) => {
        if (!alive) return
        setItems(list.items)
        setActiveIndex(0)
        if (list.items.length === 0) setOpen(false)
      })
      .catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (items.length < 2) return
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % items.length)
      setTransitionKey((key) => key + 1)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [items.length])

  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [open])

  const activeNotice = selectActiveNotice(items, activeIndex)
  if (!activeNotice) return null
  return <>
    <aside className={styles.noticeBar}>
      <span>공지</span>
      <Link key={transitionKey} className={styles.noticeBarHeadline} href={`${ROUTES.NOTICES}/${activeNotice.id}`}>{activeNotice.title}</Link>
      <time>{formatDate(activeNotice.publishedAt)}</time>
      <button type="button" aria-label="공지사항 목록 열기" onClick={() => setOpen(true)}><ChevronRight /></button>
    </aside>
    {open && <div className={styles.noticeSheetLayer} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className={styles.noticeSheet} role="dialog" aria-modal="true" aria-labelledby="notice-sheet-title">
        <header><div><h2 id="notice-sheet-title">공지사항</h2><p>Filtory 이용 안내와 업데이트를 확인해 주세요.</p></div><button type="button" aria-label="공지사항 목록 닫기" onClick={() => setOpen(false)}><X /></button></header>
        <div>{items.map((item) => <Link key={item.id} href={`${ROUTES.NOTICES}/${item.id}`} onClick={() => setOpen(false)}><span>{item.pinned ? "고정" : "공지"}</span><strong>{item.title}</strong><time>{formatDate(item.publishedAt)}</time><ChevronRight /></Link>)}</div>
      </section>
    </div>}
  </>
}

function formatDate(value: string | null) { return value ? value.slice(0, 10).replaceAll("-", ".") : "" }
