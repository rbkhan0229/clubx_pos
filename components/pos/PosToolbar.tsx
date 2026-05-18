"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Combine,
  Lock,
  LockOpen,
  Move,
  Plus,
  Redo2,
  Scissors,
  Settings,
  Trash2,
  Undo2,
  Pencil,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { LogoMark } from "@/components/common/LogoMark";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import { useTableStore } from "@/stores/useTableStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { TableEditMode } from "@/types";

type PosToolbarProps = {
  sessionId: string;
  onOpenMenuSettings: () => void;
  onOpenSalesReport: () => void;
};

export function PosToolbar({
  sessionId,
  onOpenMenuSettings,
  onOpenSalesReport,
}: PosToolbarProps) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPosition, setSettingsPosition] = useState({ right: 16, top: 76 });
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const tableEditLocked = useWorkspaceStore((state) => state.tableEditLocked);
  const tableEditMode = useWorkspaceStore((state) => state.tableEditMode);
  const sidebarOpen = useWorkspaceStore((state) => state.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore((state) => state.setSidebarOpen);
  const setTableEditLocked = useWorkspaceStore((state) => state.setTableEditLocked);
  const setTableEditMode = useWorkspaceStore((state) => state.setTableEditMode);
  const clearSelection = useTableStore((state) => state.clearSelection);
  const captureMoveSnapshot = useTableStore((state) => state.captureMoveSnapshot);
  const clearMoveSnapshot = useTableStore((state) => state.clearMoveSnapshot);

  function chooseMode(mode: TableEditMode) {
    clearSelection();
    if (mode === "move") {
      captureMoveSnapshot(sessionId);
    } else {
      clearMoveSnapshot(sessionId);
    }
    setTableEditMode(mode);
  }

  return (
    <header className="relative z-10 flex h-[76px] min-w-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 shadow-sm backdrop-blur-xl">
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <LogoMark className="hidden w-24 sm:block" priority />
        <Button
          className="px-3 sm:px-4"
          icon={<ArrowLeft size={18} />}
          onClick={() => router.push("/counter/dashboard")}
          variant="secondary"
        >
          <span className="hidden sm:inline">{t.backToDashboard}</span>
        </Button>
        <ToolbarIconButton ariaLabel={t.undo} disabled icon={<Undo2 size={22} />} />
        <ToolbarIconButton ariaLabel={t.redo} disabled icon={<Redo2 size={22} />} />
      </div>

      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
        <section className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <span className="hidden pl-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 2xl:inline">
            {t.tableEdit}
          </span>
          <button
            className={`touch-target inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black ${
              tableEditLocked ? "bg-white text-slate-700" : "bg-club-acid text-club-black"
            }`}
            onClick={() => setTableEditLocked(!tableEditLocked)}
            type="button"
          >
            {tableEditLocked ? <Lock size={16} /> : <LockOpen size={16} />}
            <span className="hidden xl:inline">{tableEditLocked ? t.editLocked : t.editUnlocked}</span>
          </button>
          <ModeButton disabled={tableEditLocked} icon={<Pencil size={16} />} label={t.numberEdit} mode="number" selectedMode={tableEditMode} onClick={chooseMode} />
          <ModeButton disabled={tableEditLocked} icon={<Plus size={16} />} label={t.addTable} mode="add" selectedMode={tableEditMode} onClick={chooseMode} />
          <ModeButton disabled={tableEditLocked} icon={<Move size={16} />} label={t.moveTable} mode="move" selectedMode={tableEditMode} onClick={chooseMode} />
          <ModeButton disabled={tableEditLocked} icon={<Trash2 size={16} />} label={t.deleteTable} mode="delete" selectedMode={tableEditMode} onClick={chooseMode} />
        </section>

        <section className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <Button className="px-3" disabled icon={<Combine size={16} />} variant="ghost">
            <span className="hidden xl:inline">{t.mergeSplit}</span>
          </Button>
          <Button className="px-3" disabled icon={<Scissors size={16} />} variant="ghost">
            <span className="hidden xl:inline">{t.comingSoon}</span>
          </Button>
        </section>

        <div className="relative flex items-center gap-2">
          <ToolbarIconButton
            ariaLabel={t.settings}
            buttonRef={settingsButtonRef}
            icon={<Settings size={24} />}
            onClick={() => {
              const rect = settingsButtonRef.current?.getBoundingClientRect();
              if (rect) {
                setSettingsPosition({
                  right: Math.max(16, window.innerWidth - rect.right),
                  top: rect.bottom + 8,
                });
              }
              setSettingsOpen((value) => !value);
            }}
          />
          {settingsOpen
            ? createPortal(
                <div
                  className="fixed z-[80] grid w-56 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                  style={{ right: settingsPosition.right, top: settingsPosition.top }}
                >
                  <button
                    className="min-h-11 rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-lime-50 active:bg-club-acid/30"
                    onClick={() => {
                      setSettingsOpen(false);
                      onOpenMenuSettings();
                    }}
                    type="button"
                  >
                    {t.menuSettings}
                  </button>
                  <button
                    className="min-h-11 rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-lime-50 active:bg-club-acid/30"
                    onClick={() => {
                      setSettingsOpen(false);
                      onOpenSalesReport();
                    }}
                    type="button"
                  >
                    {t.salesReport}
                  </button>
                </div>,
                document.body,
              )
            : null}
          <ToolbarIconButton
            ariaLabel={sidebarOpen ? t.collapseSidebar : t.expandSidebar}
            icon={
              sidebarOpen ? (
                <PanelRightClose size={24} />
              ) : (
                <PanelRightOpen size={24} />
              )
            }
            onClick={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      </div>
    </header>
  );
}

function ToolbarIconButton({
  ariaLabel,
  buttonRef,
  disabled = false,
  icon,
  onClick,
}: {
  ariaLabel: string;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
  icon: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-club-green hover:bg-lime-50 active:scale-95 active:bg-club-acid disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
      disabled={disabled}
      onClick={onClick}
      ref={buttonRef}
      title={ariaLabel}
      type="button"
    >
      {icon}
    </button>
  );
}

function ModeButton({
  disabled,
  icon,
  label,
  mode,
  selectedMode,
  onClick,
}: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  mode: TableEditMode;
  selectedMode: TableEditMode;
  onClick: (mode: TableEditMode) => void;
}) {
  const active = selectedMode === mode;

  return (
    <button
      className={`touch-target inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active ? "bg-club-acid text-club-black" : "bg-white text-slate-700 hover:bg-lime-50"
      }`}
      disabled={disabled}
      onClick={() => onClick(mode)}
      type="button"
    >
      {icon}
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}
