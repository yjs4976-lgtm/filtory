import { BottomNav } from "@/components/common/BottomNav"
import { Header } from "@/components/common/Header"

export function AdminAppShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Header title={title} showBack />
      <main className="page admin-page">{children}</main>
      <BottomNav />
    </div>
  )
}
