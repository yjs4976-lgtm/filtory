import { AppShell } from "@/components/common/AppShell"
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice"

export default function VerifyEmailPage() {
  return (
    <AppShell title="이메일 인증" showBack>
      <EmailVerificationNotice />
    </AppShell>
  )
}
