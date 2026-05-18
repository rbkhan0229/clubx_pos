"use client";

import type { ReactNode } from "react";
import {
  CalendarClock,
  Hourglass,
  Smartphone,
  UploadCloud,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
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

export function RightSidebar() {
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
          <SidebarContent activeTab={activeSidebarTab} />
        </div>
      </div>
    </aside>
  );
}

function SidebarContent({ activeTab }: { activeTab: SidebarTab }) {
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
    <PlaceholderPanel>
      <button className="touch-target rounded-2xl bg-club-acid px-5 py-3 text-sm font-black text-club-black" type="button">
        {t.createActivationCode}
      </button>
    </PlaceholderPanel>
  );
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
