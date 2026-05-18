"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import {
  ApiError,
  clearAdminToken,
  apiFetch,
  getAdminToken,
  getApiBase,
  setAdminToken,
} from "@/lib/api/client";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user?: {
    username?: string | null;
    display_name?: string | null;
    role?: string | null;
  };
};

function describeLoginError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "아이디 또는 비밀번호가 올바르지 않습니다.";
    }
    if (err.status === 403) {
      return "이 계정으로 POS 관리자 토큰을 발급할 수 없습니다. 운영 권한이 있는 계정으로 다시 시도하세요.";
    }
    if (err.status === 0) {
      return "ClubX 백엔드에 연결할 수 없습니다. API 주소와 CORS 설정을 확인하세요.";
    }
    return err.message || `토큰 발급 요청에 실패했습니다. (${err.status})`;
  }
  return err instanceof Error ? err.message : "토큰 발급 중 알 수 없는 오류가 발생했습니다.";
}

export default function CounterSettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setMessage("관리자 토큰을 이 브라우저에 저장했습니다.");
    setError(null);
  }

  function handleDelete() {
    clearAdminToken();
    setToken("");
    setHasToken(false);
    setSavedAt(null);
    setMessage("저장된 관리자 토큰을 삭제했습니다.");
    setError(null);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username_or_email = loginId.trim();
    if (!username_or_email || !password) return;

    setLoginLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        anonymous: true,
        body: {
          username_or_email,
          password,
        },
      });
      setAdminToken(res.access_token);
      setToken(res.access_token);
      setPassword("");
      setHasToken(true);
      setSavedAt(new Date().toLocaleTimeString());
      const userLabel =
        res.user?.display_name || res.user?.username || "관리자 계정";
      setMessage(`${userLabel} 토큰을 발급받아 저장했습니다.`);
    } catch (err) {
      setError(describeLoginError(err));
    } finally {
      setLoginLoading(false);
    }
  }

  const apiBase = getApiBase() || "설정되지 않음";

  return (
    <AppShell compact>
      <div className="mb-5 flex items-center justify-between">
        <Button
          icon={<ArrowLeft size={18} />}
          onClick={() => router.push("/counter/dashboard")}
          variant="secondary"
        >
          대시보드로
        </Button>
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black sm:text-3xl">POS 설정</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          관리자 토큰은 자동으로 표시되는 값이 아닙니다. ClubX 백엔드 관리자
          계정으로 로그인해 발급받거나, 이미 받은 access_token을 아래에
          붙여넣어 저장해야 합니다.
        </p>

        <dl className="mt-5 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="font-black text-slate-600">API 주소</dt>
            <dd className="truncate text-right font-mono text-slate-700">
              {apiBase}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-black text-slate-600">토큰 상태</dt>
            <dd className="text-right font-black">
              {hasToken ? "저장됨" : "없음"}
            </dd>
          </div>
        </dl>

        <form
          className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={handleLogin}
        >
          <div>
            <h2 className="text-base font-black text-club-ink">
              관리자 계정으로 토큰 발급
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              백엔드 로그인 API에서 발급된 접근 토큰이 이 브라우저의
              저장소 키 `clubx_admin_token`에 저장됩니다.
            </p>
          </div>
          <Input
            autoComplete="username"
            label="아이디 또는 이메일"
            name="admin-login-id"
            placeholder="관리자 아이디 또는 이메일"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
          />
          <Input
            autoComplete="current-password"
            label="비밀번호"
            name="admin-password"
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            disabled={!loginId.trim() || !password || loginLoading}
            icon={<KeyRound size={18} />}
            type="submit"
          >
            {loginLoading ? "토큰 발급 중..." : "로그인해서 토큰 저장"}
          </Button>
        </form>

        <div className="mt-5 grid gap-3">
          <Input
            label="관리자 토큰 직접 입력"
            name="admin-token"
            placeholder="접근 토큰을 붙여넣으세요"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              icon={<Save size={18} />}
              onClick={handleSave}
              disabled={!token.trim()}
            >
              토큰 저장
            </Button>
            <Button
              icon={<Trash2 size={18} />}
              onClick={handleDelete}
              variant="danger"
              disabled={!hasToken}
            >
              토큰 삭제
            </Button>
          </div>
          {message ? (
            <p className="text-xs font-semibold text-emerald-700">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="text-xs font-semibold text-red-700">{error}</p>
          ) : null}
          {savedAt ? (
            <p className="text-xs font-semibold text-emerald-700">
              마지막 저장 시각: {savedAt}
            </p>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
