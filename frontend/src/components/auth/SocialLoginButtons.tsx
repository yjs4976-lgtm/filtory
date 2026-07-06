"use client";

import { useSearchParams } from "next/navigation";
import styles from "@/styles/App.module.css";
import { KakaoLoginButton } from "./social/KakaoLoginButton";
import { GoogleLoginButton } from "./social/GoogleLoginButton";
import { NaverLoginButton } from "./social/NaverLoginButton";

export function SocialLoginButtons() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  return (
    <div className={styles.socialIconGroup}>
      <GoogleLoginButton nextPath={nextPath} />
      <NaverLoginButton nextPath={nextPath} />
      <KakaoLoginButton nextPath={nextPath} />
    </div>
  );
}
