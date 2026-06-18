"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { authService } from "@/services/authService";

export function FindIdForm() {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [foundEmail, setFoundEmail] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setFoundEmail("");

    if (!name && !nickname) {
      setError("이름 또는 닉네임을 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await authService.findId({
        name,
        nickname,
      });

      setFoundEmail(result.data.email || "조건에 맞는 이메일이 없습니다.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "아이디 찾기에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      {foundEmail && (
        <div className="result-box">
          <p>가입된 이메일</p>
          <strong>{foundEmail}</strong>
        </div>
      )}

      <label className="form-label">
        이름
        <input
          className="form-input"
          type="text"
          placeholder="가입 시 입력한 이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className="form-label">
        닉네임
        <input
          className="form-input"
          type="text"
          placeholder="가입 시 입력한 닉네임"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "확인 중..." : "아이디 찾기"}
      </button>

      <p className="auth-bottom-text">
        기억나셨나요? <Link href={ROUTES.LOGIN}>로그인하기</Link>
      </p>
    </form>
  );
}
