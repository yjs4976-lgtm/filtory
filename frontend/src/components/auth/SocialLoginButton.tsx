import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import type { SocialProvider } from "@/lib/types";
import { SOCIAL_PROVIDERS } from "@/lib/constants";
import styles from "@/styles/App.module.css";

interface SocialLoginButtonProps {
  provider: SocialProvider;
  onClick: () => void;
}

export function SocialLoginButton({ provider, onClick }: SocialLoginButtonProps) {
  const { t } = useLanguage();
  const item = SOCIAL_PROVIDERS[provider];
  const providerLabel = provider === "kakao" ? "Kakao" : provider === "naver" ? "Naver" : "Google";

  return (
    <button
      type="button"
      className={styles.socialIconButton}
      style={{ backgroundColor: item.color }}
      onClick={onClick}
      aria-label={t.auth.socialLoginAria.replace("{provider}", providerLabel)}
    >
      <Image src={item.icon} alt="" width={24} height={24} />
    </button>
  );
}
