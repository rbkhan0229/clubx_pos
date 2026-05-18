"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { subscribeClubxSync } from "@/lib/localSync";
import { useAppStore } from "@/stores/useAppStore";
import { useVisitStore } from "@/stores/useVisitStore";
import { useWaitingStore } from "@/stores/useWaitingStore";
import type { Guest, PartyCard } from "@/types";

type WaitingMode = "home" | "register" | "lookup" | "complete";

type GuestDraft = {
  id: string;
  name: string;
  phone: string;
};

type FieldErrors = Record<string, string>;

const EMPTY_PARTY_CARDS: PartyCard[] = [];

export function WaitingSiteClient({ waitingSiteId }: { waitingSiteId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadWaitingSites = useWaitingStore((state) => state.loadWaitingSites);
  const site = useWaitingStore((state) => state.sitesById[waitingSiteId]);
  const getWaitingSiteById = useWaitingStore((state) => state.getWaitingSiteById);
  const loadVisits = useVisitStore((state) => state.loadVisits);
  const createWaitingPartyCard = useVisitStore((state) => state.createWaitingPartyCard);
  const partyCards = useVisitStore(
    (state) => (site ? state.partyCardsBySession[site.sessionId] ?? EMPTY_PARTY_CARDS : EMPTY_PARTY_CARDS),
  );
  const [mode, setMode] = useState<WaitingMode>("home");
  const [guestDrafts, setGuestDrafts] = useState<GuestDraft[]>([newGuestDraft()]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completedCard, setCompletedCard] = useState<PartyCard | null>(null);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupSubmitted, setLookupSubmitted] = useState(false);

  useEffect(() => {
    loadWaitingSites();
    const found = getWaitingSiteById(waitingSiteId);
    if (found) loadVisits(found.sessionId);
  }, [getWaitingSiteById, loadVisits, loadWaitingSites, waitingSiteId]);

  useEffect(
    () =>
      subscribeClubxSync((payload) => {
        if (payload.store === "waiting") loadWaitingSites();
        if (site && payload.store === "visits" && (!payload.sessionId || payload.sessionId === site.sessionId)) {
          loadVisits(site.sessionId);
        }
      }),
    [loadVisits, loadWaitingSites, site],
  );

  const lookupResult = useMemo(() => {
    if (!lookupSubmitted) return null;
    const normalized = normalizePhone(lookupPhone);
    if (!normalized) return null;
    return partyCards.find(
      (card) =>
        card.type === "waiting" &&
        card.guests.some((guest) => normalizePhone(guest.phone ?? "") === normalized),
    );
  }, [lookupPhone, lookupSubmitted, partyCards]);

  if (!site) {
    return (
      <WaitingShell>
        <p className="rounded-2xl bg-white p-5 text-center font-black text-slate-600">
          {t.noWaitingRecord}
        </p>
      </WaitingShell>
    );
  }

  function validate() {
    const nextErrors: FieldErrors = {};
    guestDrafts.forEach((guest) => {
      const nameError = validateGuestName(guest.name, t);
      if (nameError) nextErrors[`name:${guest.id}`] = nameError;

      if (!guest.phone.trim()) {
        nextErrors[`phone:${guest.id}`] = t.phoneRequired;
      } else if (!isValidKoreanMobilePhone(guest.phone)) {
        nextErrors[`phone:${guest.id}`] = t.phoneInvalid;
      }
    });
    if (!agreed) nextErrors.privacy = t.privacyRequired;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function submitWaiting() {
    if (!validate()) return;
    setConfirmOpen(true);
  }

  function finalSubmit() {
    if (!validate()) {
      setConfirmOpen(false);
      return;
    }
    const guests: Guest[] = guestDrafts.map((guest) => ({
      id: `guest-waiting-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: guest.name.trim(),
      phone: normalizePhoneInput(guest.phone),
      checkedIn: false,
    }));
    const partyCard = createWaitingPartyCard(site.sessionId, guests);
    setCompletedCard(partyCard);
    setConfirmOpen(false);
    setMode("complete");
  }

  return (
    <WaitingShell>
      {mode === "home" ? (
        <div className="grid gap-3">
          <Button onClick={() => setMode("register")}>{t.registerWaiting}</Button>
          <Button onClick={() => setMode("lookup")} variant="secondary">
            {t.checkMyNumber}
          </Button>
        </div>
      ) : null}

      {mode === "register" ? (
        <div className="grid gap-4">
          <div className="grid gap-3">
            {guestDrafts.map((guest, index) => (
              <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm" key={guest.id}>
                <div className="flex items-center justify-between">
                  <p className="font-black">
                    {t.guestCount} {index + 1}
                  </p>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 disabled:opacity-40"
                    disabled={guestDrafts.length === 1}
                    onClick={() => {
                      setGuestDrafts((current) => current.filter((item) => item.id !== guest.id));
                      setErrors((current) => {
                        const next = { ...current };
                        delete next[`name:${guest.id}`];
                        delete next[`phone:${guest.id}`];
                        return next;
                      });
                    }}
                    type="button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <label className="grid gap-2 text-sm font-bold text-slate-600">
                  {t.name}
                  <input
                    className="touch-target rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-club-green"
                    onBlur={() =>
                      setErrors((current) => {
                        const next = { ...current };
                        const nameError = validateGuestName(guest.name, t);
                        if (nameError) next[`name:${guest.id}`] = nameError;
                        else delete next[`name:${guest.id}`];
                        return next;
                      })
                    }
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setGuestDrafts((current) =>
                        current.map((item) =>
                          item.id === guest.id ? { ...item, name: nextName } : item,
                        ),
                      );
                      setErrors((current) => {
                        if (!current[`name:${guest.id}`]) return current;
                        const nameError = validateGuestName(nextName, t);
                        const next = { ...current };
                        if (nameError) next[`name:${guest.id}`] = nameError;
                        else delete next[`name:${guest.id}`];
                        return next;
                      });
                    }}
                    value={guest.name}
                  />
                  {errors[`name:${guest.id}`] ? (
                    <span className="text-xs text-club-red">{errors[`name:${guest.id}`]}</span>
                  ) : null}
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-600">
                  {t.lookupPhone}
                  <input
                    className="touch-target rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-club-green"
                    inputMode="tel"
                    onBlur={() =>
                      setErrors((current) => {
                        const next = { ...current };
                        if (!guest.phone.trim()) next[`phone:${guest.id}`] = t.phoneRequired;
                        else if (!isValidKoreanMobilePhone(guest.phone)) {
                          next[`phone:${guest.id}`] = t.phoneInvalid;
                        } else {
                          delete next[`phone:${guest.id}`];
                        }
                        return next;
                      })
                    }
                    onChange={(event) => {
                      const nextPhone = normalizePhoneInput(event.target.value);
                      setGuestDrafts((current) =>
                        current.map((item) =>
                          item.id === guest.id ? { ...item, phone: nextPhone } : item,
                        ),
                      );
                      setErrors((current) => {
                        if (!current[`phone:${guest.id}`]) return current;
                        const next = { ...current };
                        if (!nextPhone.trim()) next[`phone:${guest.id}`] = t.phoneRequired;
                        else if (!isValidKoreanMobilePhone(nextPhone)) {
                          next[`phone:${guest.id}`] = t.phoneInvalid;
                        } else {
                          delete next[`phone:${guest.id}`];
                        }
                        return next;
                      });
                    }}
                    value={guest.phone}
                  />
                  {errors[`phone:${guest.id}`] ? (
                    <span className="text-xs text-club-red">{errors[`phone:${guest.id}`]}</span>
                  ) : null}
                </label>
              </div>
            ))}
          </div>

          <Button
            icon={<Plus size={18} />}
            onClick={() => setGuestDrafts((current) => [...current, newGuestDraft()])}
            variant="secondary"
          >
            {t.addPerson}
          </Button>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <Button
              className="w-full"
              onClick={() => setPrivacyOpen(true)}
              variant="secondary"
            >
              {t.viewPrivacyPolicy}
            </Button>
            <label className="mt-3 flex items-start gap-2 text-sm font-bold text-slate-700">
              <input
                checked={agreed}
                className="mt-1 h-5 w-5 accent-club-green"
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  setErrors((current) => {
                    if (!event.target.checked) return current;
                    const next = { ...current };
                    delete next.privacy;
                    return next;
                  });
                }}
                type="checkbox"
              />
              {t.privacyAgree}
            </label>
            {errors.privacy ? <p className="mt-2 text-xs font-bold text-club-red">{errors.privacy}</p> : null}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => setMode("home")} variant="secondary">
              {t.cancel}
            </Button>
            <Button onClick={submitWaiting}>{t.submitWaiting}</Button>
          </div>
        </div>
      ) : null}

      {mode === "lookup" ? (
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-600">
            {t.lookupPhone}
            <input
              className="touch-target rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-club-green"
              inputMode="tel"
              onChange={(event) => {
                setLookupSubmitted(false);
                setLookupPhone(normalizePhoneInput(event.target.value));
              }}
              value={lookupPhone}
            />
          </label>
          <Button onClick={() => setLookupSubmitted(true)}>{t.checkMyNumber}</Button>
          {lookupSubmitted ? (
            lookupResult ? (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-2xl font-black">{lookupResult.code}</p>
                <p className="mt-1 font-bold">
                  {t.waitingOrder}: {lookupResult.waitingOrder}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  {lookupResult.guests.map((guest) => guest.name).join(", ")}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  {t.status}: {partyCardStatusText(lookupResult, false, t)}
                </p>
              </div>
            ) : (
              <p className="rounded-2xl bg-white p-5 text-center font-black text-slate-600">
                {t.noWaitingRecord}
              </p>
            )
          ) : null}
          <Button onClick={() => setMode("home")} variant="secondary">
            {t.back}
          </Button>
        </div>
      ) : null}

      {mode === "complete" && completedCard ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-2xl font-black">{t.waitingRegistered}</p>
          <p className="mt-4 text-4xl font-black text-club-green">{completedCard.code}</p>
          <p className="mt-2 font-black">
            {t.waitingOrder}: {completedCard.waitingOrder}
          </p>
          <p className="mt-1 font-bold">
            {t.totalGuestCount}: {completedCard.guests.length}
          </p>
          <p className="mt-4 text-sm font-bold text-slate-600">{t.waitUntilCalled}</p>
          <Button className="mt-5 w-full" onClick={() => setMode("home")}>
            {t.back}
          </Button>
        </div>
      ) : null}

      <Modal
        onClose={() => setConfirmOpen(false)}
        open={confirmOpen}
        title={t.confirmWaitingTitle}
      >
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">{t.confirmWaitingPrompt}</p>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <p>
              {t.totalGuestCount}: {guestDrafts.length}
            </p>
            <ul className="mt-2 grid gap-1">
              {guestDrafts.map((guest) => (
                <li key={guest.id}>
                  {guest.name} / {guest.phone}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => setConfirmOpen(false)} variant="secondary">
              {t.cancel}
            </Button>
            <Button onClick={finalSubmit}>{t.finalSubmit}</Button>
          </div>
        </div>
      </Modal>
      <Modal
        onClose={() => setPrivacyOpen(false)}
        open={privacyOpen}
        title={t.privacyPolicy}
      >
        <p className="whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">
          {t.privacyPolicyText}
        </p>
      </Modal>
    </WaitingShell>
  );
}

function WaitingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f8f2] p-4 text-club-ink">
      <div className="mx-auto grid max-w-md gap-5">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
            ClubX POS
          </p>
          <h1 className="text-3xl font-black">Waiting</h1>
        </header>
        {children}
      </div>
    </main>
  );
}

function newGuestDraft(): GuestDraft {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    phone: "",
  };
}

function normalizePhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function isValidKoreanMobilePhone(value: string) {
  return /^010-\d{4}-\d{4}$/.test(value);
}

function validateGuestName(name: string, t: ReturnType<typeof getDictionary>) {
  const trimmed = name.trim();
  if (!trimmed) return t.nameRequired;
  if (/\d/.test(trimmed)) return t.nameNoNumbers;
  return "";
}

function partyCardStatusText(
  card: PartyCard,
  allChecked: boolean,
  t: ReturnType<typeof getDictionary>,
) {
  if (card.status === "overdue") return t.overdue;
  if (card.status === "seated") return t.seated;
  if (card.status === "completed") return t.completed;
  if (allChecked) return t.checkedIn;
  return t.notCheckedIn;
}
