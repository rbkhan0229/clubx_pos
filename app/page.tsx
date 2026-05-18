"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push("/login");
    }, 2300);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="text-center">
        <p className="mb-4 text-sm font-black uppercase tracking-[0.24em] text-club-lime">
          School Festival Pub
        </p>
        <h1 className="text-6xl font-black leading-none text-club-ink sm:text-8xl">
          <span>ClubX:</span>
          <span className="ml-4 text-club-lime">
            <span className="splash-letter" style={{ animationDelay: "480ms" }}>
              p
            </span>
            <span className="splash-letter" style={{ animationDelay: "760ms" }}>
              o
            </span>
            <span className="splash-letter" style={{ animationDelay: "1040ms" }}>
              s
            </span>
          </span>
        </h1>
      </section>
    </main>
  );
}
