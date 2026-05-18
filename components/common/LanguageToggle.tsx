"use client";

import { Languages } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";

export function LanguageToggle() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const next = language === "ko" ? "en" : "ko";

  return (
    <button
      aria-label="Toggle language"
      className="touch-target inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-club-ink shadow-sm transition hover:border-club-green/40 hover:bg-lime-50"
      onClick={() => setLanguage(next)}
      type="button"
    >
      <Languages size={17} />
      {language.toUpperCase()}
    </button>
  );
}
