"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/lib/routes";
import styles from "@/styles/App.module.css";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email, password });
      showToast({
        title: "로그인되었습니다.",
        description: "다시 오신 걸 환영해요!",
        tone: "success",
      });
      router.push(ROUTES.MYPAGE);
    } catch (error) {
      setError(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      <label className={styles.label} htmlFor="login-email">
        이메일
        <input
          id="login-email"
          className={styles.input}
          type="email"
          placeholder="example@email.com"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="login-password">
        비밀번호
        <input
          id="login-password"
          className={styles.input}
          type="password"
          placeholder="비밀번호를 입력해주세요"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>

      <div className={styles.authLinks}>
        <Link href={ROUTES.FIND_ID}>아이디 찾기</Link>
        <span>|</span>
        <Link href={ROUTES.FORGOT_PASSWORD}>비밀번호 찾기</Link>
      </div>

      <p className={styles.authBottomText}>
        아직 회원이 아니신가요? <Link href={ROUTES.SIGNUP}>회원가입</Link>
      </p>
    </form>
  );
}
