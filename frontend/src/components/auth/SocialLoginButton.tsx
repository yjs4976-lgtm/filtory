import Image from "next/image";
import type { SocialProvider } from "@/lib/types";
import { SOCIAL_PROVIDERS } from "@/lib/constants";
import styles from "@/styles/App.module.css";

interface SocialLoginButtonProps {
  provider: SocialProvider;
  onClick: () => void;
}

export function SocialLoginButton({ provider, onClick }: SocialLoginButtonProps) {
  const item = SOCIAL_PROVIDERS[provider];

  return (
    <button
      type="button"
      className={styles.socialIconButton}
      style={{ backgroundColor: item.color }}
      onClick={onClick}
      aria-label={`${item.label} 로그인`}
    >
      <Image src={item.icon} alt="" width={24} height={24} />
    </button>
  );
}
