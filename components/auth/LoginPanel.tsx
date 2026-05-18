"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Hand, ShieldCheck } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/stores/useAppStore";
import { useHandyStore } from "@/stores/useHandyStore";
import type { Mode } from "@/types";

const modeConfig = {
  counter: {
    icon: CreditCard,
    titleKey: "counterMode",
    helpKey: "counterHelp",
  },
  handy: {
    icon: Hand,
    titleKey: "handyMode",
    helpKey: "handyHelp",
  },
} as const;

export function LoginPanel() {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const setMockLogin = useAppStore((state) => state.setMockLogin);
  const loadHandyState = useHandyStore((state) => state.loadHandyState);
  const connectDevice = useHandyStore((state) => state.connectDevice);
  const t = getDictionary(language);
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState("");

  function handleCounterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = String(form.get("id") ?? "").trim();
    const password = String(form.get("password") ?? "").trim();

    if (!id || !password) {
      setError(t.invalidLogin);
      return;
    }

    setMockLogin("counter");
    router.push("/counter/dashboard");
  }

  function handleHandySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadHandyState();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("activationCode") ?? "").trim();
    const staffName = String(form.get("staffName") ?? "").trim();

    const device = connectDevice(code, staffName);
    if (!device) {
      setError(!staffName ? t.invalidLogin : t.invalidActivationCode);
      return;
    }

    setMockLogin("handy", staffName);
    router.push(`/handy/session/${device.sessionId}`);
  }

  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-7">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-club-lime">
          ClubX
        </p>
        <h1 className="text-3xl font-black sm:text-4xl">{t.loginTitle}</h1>
        <p className="mt-3 text-base font-semibold text-slate-600">
          {t.loginSubtitle}
        </p>
      </div>

      {!mode ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["counter", "handy"] as const).map((item) => {
            const config = modeConfig[item];
            const Icon = config.icon;

            return (
              <button
                className={cn(
                  "group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-club-green hover:bg-lime-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-club-green",
                )}
                key={item}
                onClick={() => {
                  setMode(item);
                  setError("");
                }}
                type="button"
              >
                <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-club-acid text-club-black shadow-sm">
                  <Icon size={24} />
                </span>
                <span className="block text-xl font-black">
                  {t[config.titleKey]}
                </span>
                <span className="mt-2 block text-sm font-semibold text-slate-600">
                  {t[config.helpKey]}
                </span>
              </button>
            );
          })}
        </div>
      ) : mode === "counter" ? (
        <form className="grid gap-4" onSubmit={handleCounterSubmit}>
          <Input autoFocus label={t.id} name="id" placeholder="counter" />
          <Input label={t.password} name="password" placeholder="••••••••" type="password" />
          {error ? <p className="text-sm font-bold text-club-red">{error}</p> : null}
          <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr]">
            <Button onClick={() => setMode(null)} variant="secondary">
              {t.back}
            </Button>
            <Button icon={<ShieldCheck size={18} />} type="submit">
              {t.enter}
            </Button>
          </div>
        </form>
      ) : (
        <form className="grid gap-4" onSubmit={handleHandySubmit}>
          <Input
            autoFocus
            label={t.activationCode}
            name="activationCode"
            placeholder="CLUBX"
          />
          <Input label={t.staffName} name="staffName" placeholder="Staff A" />
          {error ? <p className="text-sm font-bold text-club-red">{error}</p> : null}
          <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr]">
            <Button onClick={() => setMode(null)} variant="secondary">
              {t.back}
            </Button>
            <Button icon={<ShieldCheck size={18} />} type="submit">
              {t.enter}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
