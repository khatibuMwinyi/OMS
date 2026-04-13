import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentSession } from "@/lib/session-server";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card glass auth-card--login">
        <div className="brand-row auth-brand-row">
          <Image
            className="brand-mark"
            src="/oweru.jpeg"
            alt="Oweru International logo"
            width={56}
            height={56}
            priority
          />
          <div className="brand-name">
            <strong>OWERU</strong>
            <span>Management System</span>
          </div>
        </div>

        <p className="auth-panel-note">
          Sign in to open the dashboard and work with system records.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
