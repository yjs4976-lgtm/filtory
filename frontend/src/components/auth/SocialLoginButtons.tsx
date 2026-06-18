import styles from "@/styles/App.module.css";
import { KakaoLoginButton } from "./social/KakaoLoginButton";
import { GoogleLoginButton } from "./social/GoogleLoginButton";
import { NaverLoginButton } from "./social/NaverLoginButton";

export function SocialLoginButtons() {
  return (
    <div className={styles.socialIconGroup}>
      <GoogleLoginButton />
      <NaverLoginButton />
      <KakaoLoginButton />
    </div>
  );
}
