"use client";

import { MouseEvent, useState } from "react";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatDateTime } from "@/lib/utils/date";
import { useAppStore } from "@/stores/useAppStore";
import type { BusinessSession } from "@/types";

type SessionCardProps = {
  session: BusinessSession;
  onOpen: (id: string) => void;
};

export function SessionCard({ session, onOpen }: SessionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const language = useAppStore((state) => state.language);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const duplicateSession = useAppStore((state) => state.duplicateSession);
  const t = getDictionary(language);
  const locale = language === "ko" ? "ko-KR" : "en-US";

  function stop(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <article
      className="relative cursor-pointer overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-club-green/70 hover:bg-lime-50"
      onClick={() => onOpen(session.id)}
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0 pr-12">
          <h2 className="text-xl font-black">{session.name}</h2>
          {!session.lastAccessedAt ? (
            <span className="mt-3 inline-flex rounded-full bg-club-acid px-3 py-1 text-xs font-black text-club-black">
              {t.new}
            </span>
          ) : null}
        </div>
        <div className="absolute right-4 top-4 z-20" onClick={stop}>
          <Button
            aria-label={t.sessionActions}
            className="h-12 min-h-0 w-12 rounded-full border border-slate-300 bg-slate-100 p-0 text-club-ink shadow-sm hover:border-club-green hover:bg-club-acid active:scale-95"
            icon={<MoreHorizontal size={24} strokeWidth={2.5} />}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((value) => !value);
            }}
            title={t.sessionActions}
            variant="ghost"
          />
          {menuOpen ? (
            <div
              className="absolute right-0 top-[52px] z-50 grid min-w-44 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
              onClick={stop}
            >
              <button
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-club-ink hover:bg-lime-50 active:bg-club-acid/30"
                onClick={(event) => {
                  event.stopPropagation();
                  void duplicateSession(session.id).catch(() => undefined);
                  setMenuOpen(false);
                }}
                type="button"
              >
                <Copy size={16} />
                {t.duplicate}
              </button>
              <button
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-club-red hover:bg-club-red/10 active:bg-club-red/20"
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteSession(session.id).catch(() => undefined);
                  setMenuOpen(false);
                }}
                type="button"
              >
                <Trash2 size={16} />
                {t.delete}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-3 text-sm font-semibold text-slate-600">
        <div className="flex justify-between gap-4">
          <dt>{t.createdAt}</dt>
          <dd className="text-right text-club-ink">
            {formatDateTime(session.createdAt, locale)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>{t.lastAccessedAt}</dt>
          <dd className="text-right text-club-ink">
            {session.lastAccessedAt
              ? formatDateTime(session.lastAccessedAt, locale)
              : t.new}
          </dd>
        </div>
      </dl>
    </article>
  );
}
