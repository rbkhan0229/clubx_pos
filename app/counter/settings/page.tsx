"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import {
  clearAdminToken,
  getAdminToken,
  getApiBase,
  setAdminToken,
} from "@/lib/api/client";

export default function CounterSettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const existing = getAdminToken();
    if (existing) {
      setToken(existing);
      setHasToken(true);
    }
  }, []);

  function handleSave() {
    const trimmed = token.trim();
    if (!trimmed) return;
    setAdminToken(trimmed);
    setHasToken(true);
    setSavedAt(new Date().toLocaleTimeString());
  }

  function handleDelete() {
    clearAdminToken();
    setToken("");
    setHasToken(false);
    setSavedAt(null);
  }

  const apiBase = getApiBase() || "(not configured)";

  return (
    <AppShell compact>
      <div className="mb-5 flex items-center justify-between">
        <Button
          icon={<ArrowLeft size={18} />}
          onClick={() => router.push("/counter/dashboard")}
          variant="secondary"
        >
          Back
        </Button>
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black sm:text-3xl">POS Settings</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Paste the admin access token issued by the ClubX backend. It is stored
          locally in this browser only and is sent as a bearer token on each
          admin API call.
        </p>

        <dl className="mt-5 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="font-black text-slate-600">API base</dt>
            <dd className="truncate text-right font-mono text-slate-700">
              {apiBase}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-black text-slate-600">Token status</dt>
            <dd className="text-right font-black">
              {hasToken ? "Saved" : "Not set"}
            </dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-3">
          <Input
            label="Admin token"
            name="admin-token"
            placeholder="Paste admin bearer token here"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              icon={<Save size={18} />}
              onClick={handleSave}
              disabled={!token.trim()}
            >
              Save token
            </Button>
            <Button
              icon={<Trash2 size={18} />}
              onClick={handleDelete}
              variant="danger"
              disabled={!hasToken}
            >
              Delete token
            </Button>
          </div>
          {savedAt ? (
            <p className="text-xs font-semibold text-emerald-700">
              Saved at {savedAt}.
            </p>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
