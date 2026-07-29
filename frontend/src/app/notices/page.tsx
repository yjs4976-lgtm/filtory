"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { AppShell } from "@/components/common/AppShell"
import { ROUTES } from "@/lib/routes"
import { noticeService, type NoticeSummary } from "@/services/noticeService"
import styles from "@/styles/App.module.css"

export default function NoticesPage() {
  const [items, setItems] = useState<NoticeSummary[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { noticeService.list(1, 100).then((result) => setItems(result.items)).finally(() => setLoading(false)) }, [])
  return <AppShell title="공지사항" showBack>
    <section className={styles.noticePageHeading}><span>NOTICE</span><h1>공지사항</h1><p>Filtory 이용 안내와 업데이트를 확인해 주세요.</p></section>
    <div className={styles.noticeList}>
      {loading && <p>공지사항을 불러오는 중이에요.</p>}
      {!loading && items.length === 0 && <p>등록된 공지사항이 없습니다.</p>}
      {items.map((item) => <Link key={item.id} href={`${ROUTES.NOTICES}/${item.id}`}><span>{item.pinned ? "고정" : "공지"}</span><div><strong>{item.title}</strong><time>{formatDate(item.publishedAt)}</time></div><ChevronRight /></Link>)}
    </div>
  </AppShell>
}
function formatDate(value: string | null) { return value ? value.slice(0, 10).replaceAll("-", ".") : "-" }

