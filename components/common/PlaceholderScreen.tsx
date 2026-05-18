"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { LogoMark } from "@/components/common/LogoMark";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";

type PlaceholderScreenProps = {
  titleKey: "posWorkspace" | "handyCanvas" | "waitingSite";
};

export function PlaceholderScreen({ titleKey }: PlaceholderScreenProps) {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-2xl p-6 sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <LogoMark className="w-28" />
          <Button
            icon={<ArrowLeft size={18} />}
            onClick={() => router.back()}
            variant="secondary"
          >
            {t.back}
          </Button>
        </div>
        <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-club-lime">
          ClubX POS
        </p>
        <h1 className="text-3xl font-black sm:text-5xl">{t[titleKey]}</h1>
        <p className="mt-4 text-lg font-semibold text-slate-600">
          {t.placeholderCopy}
        </p>
      </Card>
    </main>
  );
}
