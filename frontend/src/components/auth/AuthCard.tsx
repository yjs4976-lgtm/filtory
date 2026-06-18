import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import styles from "@/styles/App.module.css";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <main className={styles.authPage}>
      <section className={styles.authCard}>
        <Link href={ROUTES.HOME} className={styles.authLogo}>
          Filtory
        </Link>

        <div className={styles.authTitleBox}>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        {children}
      </section>
    </main>
  );
}
