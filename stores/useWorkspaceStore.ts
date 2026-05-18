"use client";

import { create } from "zustand";
import type { SidebarTab, TableEditMode } from "@/types";

type WorkspaceState = {
  sidebarOpen: boolean;
  activeSidebarTab: SidebarTab;
  tableEditMode: TableEditMode;
  tableEditLocked: boolean;
  lastTableCapacityPreset: {
    minCapacity: number;
    maxCapacity: number;
  };
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setTableEditMode: (mode: TableEditMode) => void;
  setTableEditLocked: (locked: boolean) => void;
  loadCapacityPreset: () => void;
  setLastTableCapacityPreset: (preset: {
    minCapacity: number;
    maxCapacity: number;
  }) => void;
  resetWorkspaceMode: () => void;
};

const capacityPresetKey = "clubx-pos:last-table-capacity-preset";

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  sidebarOpen: true,
  activeSidebarTab: "reservation",
  tableEditMode: "idle",
  tableEditLocked: true,
  lastTableCapacityPreset: {
    minCapacity: 1,
    maxCapacity: 2,
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  setTableEditMode: (mode) => set({ tableEditMode: mode }),
  setTableEditLocked: (locked) =>
    set({
      tableEditLocked: locked,
      tableEditMode: locked ? "idle" : "number",
    }),
  loadCapacityPreset: () => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(capacityPresetKey);
    if (!raw) return;

    const parsed = JSON.parse(raw) as { minCapacity: number; maxCapacity: number };
    set({
      lastTableCapacityPreset: {
        minCapacity: Math.max(1, parsed.minCapacity || 1),
        maxCapacity: Math.max(parsed.minCapacity || 1, parsed.maxCapacity || 2),
      },
    });
  },
  setLastTableCapacityPreset: (preset) => {
    const next = {
      minCapacity: Math.max(1, preset.minCapacity),
      maxCapacity: Math.max(preset.minCapacity, preset.maxCapacity),
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(capacityPresetKey, JSON.stringify(next));
    }

    set({ lastTableCapacityPreset: next });
  },
  resetWorkspaceMode: () => set({ tableEditMode: "idle" }),
}));
