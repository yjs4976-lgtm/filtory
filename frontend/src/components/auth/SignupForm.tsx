"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/lib/routes";
import type { TermsAgreementState } from "@/lib/types";
import { memberService } from "@/services/memberService";
import { TermsAgreement } from "./TermsAgreement";
import styles from "@/styles/App.module.css";

export function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [nicknameCheck, setNicknameCheck] = useState<"idle" | "available" | "unavailable">("idle");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [terms, setTerms] = useState<TermsAgreementState>({
    termsAgreed: false,
    privacyAgreed: false,
    marketingAgreed: false,
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = terms.termsAgreed && terms.privacyAgreed && nicknameCheck === "available" && !isSubmitting;

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!name || !email || !nickname || !password || !passwordConfirm) {
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

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    if (nicknameCheck !== "available") {
      setError("닉네임 중복 확인을 완료해주세요.");
      return;
    }

    if (!terms.termsAgreed || !terms.privacyAgreed) {
      setError("필수 약관에 동의해야 회원가입할 수 있어요.");
      return;
    }

    try {
      setIsSubmitting(true);

      await signup({
        name,
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

  const handleNicknameCheck = async () => {
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    const result = await memberService.checkNicknameDuplicate(nickname)
    setNicknameCheck(result.available ? "available" : "unavailable")
    setError("")
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      <label className={styles.label} htmlFor="signup-name">
        이름
        <input
          id="signup-name"
          className={styles.input}
          type="text"
          placeholder="실명을 입력해주세요"
          value={name}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
      </label>

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
        <div className={styles.inlineField}>
          <input
            id="signup-nickname"
            className={styles.input}
            type="text"
            placeholder="Filtory에서 사용할 닉네임"
            value={nickname}
            autoComplete="nickname"
            onChange={(event) => {
              setNickname(event.target.value)
              setNicknameCheck("idle")
            }}
          />
          <button type="button" className={styles.smallPillButton} onClick={handleNicknameCheck}>
            중복 확인
          </button>
        </div>
        {nicknameCheck === "available" && <span className={styles.formHintSuccess}>사용 가능한 닉네임이에요.</span>}
        {nicknameCheck === "unavailable" && <span className={styles.formHintError}>이미 사용 중인 닉네임이에요.</span>}
      </label>

      <label className={styles.label} htmlFor="signup-password">
        비밀번호
        <input
          id="signup-password"
          className={styles.input}
          type="password"
          placeholder="비밀번호를 입력해주세요"
          value={password}
          minLength={8}
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
          minLength={8}
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
