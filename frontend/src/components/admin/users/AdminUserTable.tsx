import Link from "next/link"
import type { AdminUser } from "@/lib/types"

interface AdminUserTableProps {
  users: AdminUser[]
}

export function AdminUserTable({ users }: AdminUserTableProps) {
  return (
    <section className="soft-card admin-table-card">
      <h2>전체 회원 목록</h2>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>닉네임</th>
              <th>이름</th>
              <th>이메일</th>
              <th>가입일</th>
              <th>최근 로그인</th>
              <th>분석</th>
              <th>신고</th>
              <th>상태</th>
              <th>권한</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.nickname}</td>
                <td>{user.name ?? "-"}</td>
                <td>{user.email}</td>
                <td>{user.createdAt ?? "-"}</td>
                <td>{user.lastLoginAt ?? "-"}</td>
                <td>{user.analysisCount ?? 0}</td>
                <td>{user.reportCount ?? 0}</td>
                <td>{user.status}</td>
                <td>{user.role}</td>
                <td>
                  <Link href={`/admin/users/${user.id}`} className="small-button">
                    상세
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={10} className="empty-cell">
                  회원 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
