export function AdminSampleNotice({ message = "이 화면은 백엔드 API가 연결되지 않은 조회용 샘플 데이터입니다." }: { message?: string }) {
  return <p className="soft-card admin-sample-notice" role="note">{message}</p>
}
