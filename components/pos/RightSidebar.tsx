"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  Hourglass,
  Smartphone,
  UploadCloud,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import { useHandyStore } from "@/stores/useHandyStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import type { StaffDevice } from "@/types";
import type { SidebarTab } from "@/types";

const tabs: Array<{
  id: SidebarTab;
  labelKey: keyof ReturnType<typeof getDictionary>;
  shortLabel: string;
  icon: ReactNode;
}> = [
  {
    id: "reservation",
    labelKey: "reservationManagement",
    shortLabel: "R",
    icon: <CalendarClock size={17} />,
  },
  {
    id: "waiting",
    labelKey: "waitingManagement",
    shortLabel: "W",
    icon: <Hourglass size={17} />,
  },
  {
    id: "reservationSource",
    labelKey: "reservationSourceControl",
    shortLabel: "S",
    icon: <UploadCloud size={17} />,
  },
  {
    id: "handyDevice",
    labelKey: "handyOrderDeviceManagement",
    shortLabel: "H",
    icon: <Smartphone size={17} />,
  },
];

export function RightSidebar({ sessionId }: { sessionId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const sidebarOpen = useWorkspaceStore((state) => state.sidebarOpen);
  const activeSidebarTab = useWorkspaceStore((state) => state.activeSidebarTab);
  const setActiveSidebarTab = useWorkspaceStore((state) => state.setActiveSidebarTab);

  return (
    <aside
      aria-hidden={!sidebarOpen}
      className={`relative z-20 overflow-hidden border-t border-slate-200 bg-white shadow-sm transition-[width,opacity] lg:min-h-screen lg:border-l lg:border-t-0 ${
        sidebarOpen
          ? "w-full opacity-100 lg:w-[360px]"
          : "h-0 w-0 border-0 opacity-0 lg:h-auto lg:w-0"
      }`}
    >
      <div className="flex h-full min-h-[320px] flex-col">
        <div className="flex items-center gap-2 border-b border-slate-200 p-2">
          {tabs.map((tab) => (
            <button
              aria-label={t[tab.labelKey]}
              className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-black transition ${
                activeSidebarTab === tab.id
                  ? "bg-club-acid text-club-black shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-lime-50"
              }`}
              key={tab.id}
              onClick={() => setActiveSidebarTab(tab.id)}
              title={t[tab.labelKey]}
              type="button"
            >
              {tab.icon}
            </button>
          ))}
        </div>

        <div className="flex-1 p-4">
          <SidebarContent activeTab={activeSidebarTab} sessionId={sessionId} />
        </div>
      </div>
    </aside>
  );
}

function SidebarContent({ activeTab, sessionId }: { activeTab: SidebarTab; sessionId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);

  if (activeTab === "reservation") {
    return (
      <PlaceholderPanel>
        {t.reservationSourceEmpty}
      </PlaceholderPanel>
    );
  }

  if (activeTab === "waiting") {
    return (
      <PlaceholderPanel>
        <button className="touch-target rounded-2xl bg-club-acid px-5 py-3 text-sm font-black text-club-black" type="button">
          {t.createWaitingLink}
        </button>
      </PlaceholderPanel>
    );
  }

  if (activeTab === "reservationSource") {
    return (
      <PlaceholderPanel>
        <button className="touch-target rounded-2xl bg-club-acid px-5 py-3 text-sm font-black text-club-black" type="button">
          {t.importFromClubX}
        </button>
      </PlaceholderPanel>
    );
  }

  return (
    <HandyDevicePanel sessionId={sessionId} />
  );
}

function HandyDevicePanel({ sessionId }: { sessionId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadHandyState = useHandyStore((state) => state.loadHandyState);
  const createActivationCode = useHandyStore((state) => state.createActivationCode);
  const kickDevice = useHandyStore((state) => state.kickDevice);
  const codes = useHandyStore((state) => state.activationCodesBySession[sessionId] ?? []);
  const devices = useHandyStore((state) => state.devicesBySession[sessionId] ?? []);
  const [latestCode, setLatestCode] = useState("");
  const [kickTarget, setKickTarget] = useState<StaffDevice | null>(null);
  const latestStoredCode = codes.length > 0 ? codes[codes.length - 1] : "";

  useEffect(() => {
    loadHandyState();
  }, [loadHandyState]);

  const activeDevices = devices.filter((device) => device.status === "active");

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <Button
        onClick={() => {
          const code = createActivationCode(sessionId);
          setLatestCode(code);
        }}
      >
        {t.createActivationCode}
      </Button>

      {latestCode || latestStoredCode ? (
        <div className="rounded-2xl bg-white p-4 text-center">
          <p className="text-xs font-black uppercase text-slate-500">{t.currentActivationCode}</p>
          <p className="mt-1 text-3xl font-black tracking-[0.18em]">
            {latestCode || latestStoredCode}
          </p>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-black">{t.connectedDevices}</h3>
        {activeDevices.length === 0 ? (
          <p className="rounded-xl bg-white p-3 text-sm font-bold text-slate-500">
            {t.noConnectedDevices}
          </p>
        ) : (
          <div className="grid gap-2">
            {activeDevices.map((device) => (
              <div className="rounded-xl bg-white p-3" key={device.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black">{device.staffName}</p>
                    <p className="text-xs font-bold text-slate-500">
                      {t.connectedAt}: {formatDateTime(device.connectedAt)}
                    </p>
                    <p className="text-xs font-bold text-club-green">
                      {t.status}: {t.activeStatus}
                    </p>
                  </div>
                  <Button
                    className="min-h-0 px-3 py-2"
                    onClick={() => setKickTarget(device)}
                    variant="danger"
                  >
                    {t.kickDevice}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        onClose={() => setKickTarget(null)}
        open={Boolean(kickTarget)}
        title={t.removeDeviceTitle}
      >
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">{t.removeDevicePrompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setKickTarget(null)} variant="secondary">
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                if (kickTarget) kickDevice(sessionId, kickTarget.id);
                setKickTarget(null);
              }}
              variant="danger"
            >
              {t.kickDevice}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function PlaceholderPanel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-600">{children}</div>
    </section>
  );
}
