"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { ROUTES } from "@/lib/routes"
import { adminContentService, type AdminFaq, type AdminNotice } from "@/services/noticeService"

type NoticeForm = Pick<AdminNotice, "title" | "content" | "status" | "pinned">
type FaqForm = Required<Pick<AdminFaq, "category" | "question" | "answer" | "status" | "sortOrder">>
const emptyNotice: NoticeForm = { title: "", content: "", status: "DRAFT", pinned: false }
const emptyFaq: FaqForm = { category: "GENERAL", question: "", answer: "", status: "DRAFT", sortOrder: 0 }

export default function AdminNoticesPage() {
  const [tab, setTab] = useState<"notices" | "faqs">("notices")
  const [notices, setNotices] = useState<AdminNotice[]>([])
  const [faqs, setFaqs] = useState<AdminFaq[]>([])
  const [noticeForm, setNoticeForm] = useState<NoticeForm>(emptyNotice)
  const [faqForm, setFaqForm] = useState<FaqForm>(emptyFaq)
  const [noticeId, setNoticeId] = useState<number>()
  const [faqId, setFaqId] = useState<number>()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    const [nextNotices, nextFaqs] = await Promise.all([adminContentService.listNotices(query, status), adminContentService.listFaqs()])
    setNotices(nextNotices)
    setFaqs(nextFaqs)
  }, [query, status])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 120); return () => window.clearTimeout(timer) }, [load])

  const editNotice = async (id: number) => {
    const item = await adminContentService.getNotice(id)
    setNoticeId(id)
    setNoticeForm({ title: item.title, content: item.content, status: item.status, pinned: item.pinned })
  }
  const editFaq = async (id: number) => {
    const item = await adminContentService.getFaq(id)
    setFaqId(id)
    setFaqForm({ category: item.category, question: item.question, answer: item.answer ?? "", status: item.status, sortOrder: item.sortOrder })
  }
  const saveNotice = async () => {
    await adminContentService.saveNotice(noticeForm, noticeId)
    setNoticeId(undefined); setNoticeForm(emptyNotice); setMessage("공지사항을 저장했습니다."); await load()
  }
  const archiveNotice = async (item: AdminNotice) => {
    if (!window.confirm(`"${item.title}" 공지를 목록에서 삭제할까요?\n삭제된 공지는 보관 상태로 남습니다.`)) return
    await adminContentService.archiveNotice(item)
    if (noticeId === item.id) { setNoticeId(undefined); setNoticeForm(emptyNotice) }
    setMessage("공지를 보관 처리했습니다.")
    await load()
  }
  const saveFaq = async () => {
    await adminContentService.saveFaq(faqForm, faqId)
    setFaqId(undefined); setFaqForm(emptyFaq); setMessage("FAQ를 저장했습니다."); await load()
  }

  return <AdminAppShell title="공지사항·FAQ"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN CONTENT</p><h1>공지사항·FAQ</h1><p>사용자에게 공개할 안내 콘텐츠를 작성하고 게시 상태를 관리합니다.</p></section>
    {message && <p className="admin-unlimited-note">{message}</p>}
    <div className="admin-menu-tabs" role="tablist">
      <button type="button" className={tab === "notices" ? "active" : ""} onClick={() => setTab("notices")}>공지사항</button>
      <button type="button" className={tab === "faqs" ? "active" : ""} onClick={() => setTab("faqs")}>FAQ</button>
    </div>
    {tab === "notices" ? <>
      <section className="soft-card admin-content-form">
        <h2>{noticeId ? "공지 수정" : "공지 작성"}</h2>
        <input value={noticeForm.title} maxLength={200} placeholder="공지 제목" onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} />
        <textarea value={noticeForm.content} placeholder="공지 내용을 입력하세요." onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} />
        <div><select value={noticeForm.status} onChange={(e) => setNoticeForm({ ...noticeForm, status: e.target.value as AdminNotice["status"] })}><option value="DRAFT">임시 저장</option><option value="PUBLISHED">게시</option><option value="ARCHIVED">보관</option></select><label><input type="checkbox" checked={noticeForm.pinned} onChange={(e) => setNoticeForm({ ...noticeForm, pinned: e.target.checked })} /> 상단 고정</label></div>
        <div className="admin-content-form-actions"><button type="button" onClick={() => void saveNotice()}>{noticeId ? "수정 내용 저장" : "공지 등록"}</button>{noticeId && <button type="button" className="secondary" onClick={() => { setNoticeId(undefined); setNoticeForm(emptyNotice) }}>수정 취소</button>}</div>
      </section>
      <section className="soft-card admin-table-card">
        <div className="admin-filter-grid"><input value={query} placeholder="공지 검색" onChange={(e) => setQuery(e.target.value)} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">전체 상태</option><option value="DRAFT">임시 저장</option><option value="PUBLISHED">게시</option><option value="ARCHIVED">보관</option></select></div>
        <div className="admin-content-list">{notices.map((item) => <article key={item.id}><div><span>{item.pinned ? "고정 공지" : statusLabel(item.status)}</span><strong>{item.title}</strong><small>{item.publishedAt?.slice(0, 10) ?? "게시 전"}</small></div><div>{item.status === "PUBLISHED" && <Link href={`${ROUTES.NOTICES}/${item.id}`}>보기</Link>}<button type="button" onClick={() => void editNotice(item.id)}>수정</button>{item.status !== "ARCHIVED" && <button type="button" className="danger" onClick={() => void archiveNotice(item)}>삭제</button>}</div></article>)}{notices.length === 0 && <p>등록된 공지가 없습니다.</p>}</div>
      </section>
    </> : <>
      <section className="soft-card admin-content-form">
        <h2>{faqId ? "FAQ 수정" : "FAQ 작성"}</h2>
        <input value={faqForm.category} maxLength={50} placeholder="카테고리" onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} />
        <input value={faqForm.question} maxLength={300} placeholder="질문" onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} />
        <textarea value={faqForm.answer} placeholder="답변" onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} />
        <div><select value={faqForm.status} onChange={(e) => setFaqForm({ ...faqForm, status: e.target.value as AdminFaq["status"] })}><option value="DRAFT">임시 저장</option><option value="PUBLISHED">게시</option><option value="ARCHIVED">보관</option></select><input type="number" min="0" value={faqForm.sortOrder} onChange={(e) => setFaqForm({ ...faqForm, sortOrder: Number(e.target.value) })} /></div>
        <button type="button" onClick={() => void saveFaq()}>저장</button>
      </section>
      <section className="soft-card admin-content-list">{faqs.map((item) => <article key={item.id}><div><span>{item.category}</span><strong>{item.question}</strong><small>{item.status} · 순서 {item.sortOrder}</small></div><button type="button" onClick={() => void editFaq(item.id)}>수정</button></article>)}{faqs.length === 0 && <p>등록된 FAQ가 없습니다.</p>}</section>
    </>}
  </AdminGuard></AdminAppShell>
}

function statusLabel(status: AdminNotice["status"]) {
  return status === "PUBLISHED" ? "게시 중" : status === "ARCHIVED" ? "보관됨" : "임시 저장"
}
