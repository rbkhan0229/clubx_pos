import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { LogoMark } from "@/components/common/LogoMark";

type AppShellProps = {
  children: ReactNode;
  compact?: boolean;
};

export function AppShell({ children, compact = false }: AppShellProps) {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <header className="mx-auto mb-6 flex max-w-6xl items-center justify-between gap-4">
        <LogoMark className="w-28 sm:w-32" priority />
        <LanguageToggle />
      </header>
      <div className={compact ? "mx-auto max-w-xl" : "mx-auto max-w-6xl"}>
        {children}
      </div>
    </main>
  );
}
