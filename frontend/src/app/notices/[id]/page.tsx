"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/common/AppShell"
import { Bell, ChevronLeft } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import { noticeService, type NoticeDetail } from "@/services/noticeService"
import styles from "@/styles/App.module.css"

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<NoticeDetail | null>(null)
  const [error, setError] = useState("")
  useEffect(() => { noticeService.detail(Number(id)).then(setItem).catch(() => setError("공지사항을 찾을 수 없습니다.")) }, [id])
  return <AppShell title="공지사항" showBack>
    {error && <section className={styles.noticeEmpty}>{error}</section>}
    {item && <article className={styles.noticeDetail}>
      <header><div><div className={styles.noticeDetailMeta}><span className={styles.noticeDetailIcon}><Bell /></span><span>{item.pinned ? "PINNED NOTICE" : "FILTORY NOTICE"}</span></div><h1>{item.title}</h1><time>{item.publishedAt?.slice(0, 10).replaceAll("-", ".")}</time></div></header>
      <div className={styles.noticeDetailBody}><p>{item.content}</p></div>
      <footer><Link href={ROUTES.NOTICES}><ChevronLeft /> 공지 목록으로</Link><span>Filtory의 새로운 소식을 확인해 주세요.</span></footer>
    </article>}
  </AppShell>
}
