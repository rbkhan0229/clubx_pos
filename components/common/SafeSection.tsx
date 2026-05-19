"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { Button } from "@/components/common/Button";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import type { Language } from "@/types";

type SafeSectionProps = {
  children: ReactNode;
  label?: string;
  language: Language;
};

type SafeSectionState = {
  hasError: boolean;
};

class SafeSectionBoundary extends Component<SafeSectionProps, SafeSectionState> {
  state: SafeSectionState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ClubX POS section error", this.props.label, error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const t = getDictionary(this.props.language);
    return (
      <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
        <p className="text-sm font-black text-club-red">{this.props.label}</p>
        <p className="mt-2 text-sm font-bold text-slate-700">{t.safeFallbackMessage}</p>
        <Button className="mt-4" onClick={() => window.location.reload()} variant="secondary">
          {t.reload}
        </Button>
      </section>
    );
  }
}

export function SafeSection({ children, label }: { children: ReactNode; label?: string }) {
  const language = useAppStore((state) => state.language);
  return (
    <SafeSectionBoundary key={label} label={label} language={language}>
      {children}
    </SafeSectionBoundary>
  );
}
