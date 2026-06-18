"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/lib/routes";
import type { TermsAgreementState } from "@/lib/types";
import { TermsAgreement } from "./TermsAgreement";
import styles from "@/styles/App.module.css";

export function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [terms, setTerms] = useState<TermsAgreementState>({
    termsAgreed: false,
    privacyAgreed: false,
    marketingAgreed: false,
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = terms.termsAgreed && terms.privacyAgreed && !isSubmitting;

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email || !nickname || !password || !passwordConfirm) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("올바른 이메일 형식으로 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 다릅니다.");
      return;
    }

    if (!terms.termsAgreed || !terms.privacyAgreed) {
      setError("필수 약관에 동의해야 회원가입할 수 있어요.");
      return;
    }

    try {
      setIsSubmitting(true);

      await signup({
        email,
        password,
        nickname,
        termsAgreed: terms.termsAgreed,
        privacyAgreed: terms.privacyAgreed,
        marketingAgreed: terms.marketingAgreed,
      });

      showToast({
        title: "회원가입이 완료되었어요.",
        description: "이제 Filtory를 시작해보세요.",
        tone: "success",
      });
      router.push(ROUTES.LOGIN);
    } catch (error) {
      setError(error instanceof Error ? error.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      <label className={styles.label} htmlFor="signup-email">
        이메일
        <input
          id="signup-email"
          className={styles.input}
          type="email"
          placeholder="example@email.com"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="signup-nickname">
        닉네임
        <input
          id="signup-nickname"
          className={styles.input}
          type="text"
          placeholder="Filtory에서 사용할 닉네임"
          value={nickname}
          autoComplete="nickname"
          onChange={(event) => setNickname(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="signup-password">
        비밀번호
        <input
          id="signup-password"
          className={styles.input}
          type="password"
          placeholder="비밀번호를 입력해주세요"
          value={password}
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="signup-password-confirm">
        비밀번호 확인
        <input
          id="signup-password-confirm"
          className={styles.input}
          type="password"
          placeholder="비밀번호를 다시 입력해주세요"
          value={passwordConfirm}
          autoComplete="new-password"
          onChange={(event) => setPasswordConfirm(event.target.value)}
        />
      </label>

      <TermsAgreement value={terms} onChange={setTerms} />

      <button className={styles.primaryButton} type="submit" disabled={!canSubmit}>
        {isSubmitting ? "가입 중..." : "회원가입"}
      </button>

      <p className={styles.authBottomText}>
        이미 계정이 있으신가요? <Link href={ROUTES.LOGIN}>로그인</Link>
      </p>
    </form>
  );
}
