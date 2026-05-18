"use client";

import { create } from "zustand";
import type { StaffDevice } from "@/types";

type HandyLoginState = {
  sessionId: string;
  staffName: string;
  activationCode: string;
  deviceId: string;
};

type HandyState = {
  activationCodesBySession: Record<string, string[]>;
  devicesBySession: Record<string, StaffDevice[]>;
  handyLogin: HandyLoginState | null;
  loadHandyState: () => void;
  createActivationCode: (sessionId: string) => string;
  connectDevice: (activationCode: string, staffName: string) => StaffDevice | null;
  kickDevice: (sessionId: string, deviceId: string) => void;
  getDevice: (sessionId: string, deviceId: string) => StaffDevice | undefined;
  clearHandyLogin: () => void;
};

const activationCodesKey = "clubx-pos:handy-activation-codes";
const devicesKey = "clubx-pos:handy-devices";
const handyLoginKey = "clubx-pos:handy-login";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveHandyState(
  activationCodesBySession: Record<string, string[]>,
  devicesBySession: Record<string, StaffDevice[]>,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(activationCodesKey, JSON.stringify(activationCodesBySession));
  window.localStorage.setItem(devicesKey, JSON.stringify(devicesBySession));
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export const useHandyStore = create<HandyState>((set, get) => ({
  activationCodesBySession: {},
  devicesBySession: {},
  handyLogin: null,
  loadHandyState: () => {
    const rawCodes = readJson<Record<string, string[]>>(activationCodesKey, {});
    const rawDevices = readJson<Record<string, StaffDevice[]>>(devicesKey, {});
    const activationCodesBySession =
      rawCodes && !Array.isArray(rawCodes) && typeof rawCodes === "object" ? rawCodes : {};
    const devicesBySession =
      rawDevices && !Array.isArray(rawDevices) && typeof rawDevices === "object" ? rawDevices : {};
    const handyLogin = readJson<HandyLoginState | null>(handyLoginKey, null);
    set({ activationCodesBySession, devicesBySession, handyLogin });
  },
  createActivationCode: (sessionId) => {
    const state = get();
    let code = generateCode();
    const allCodes = new Set(Object.values(state.activationCodesBySession).flat());
    while (allCodes.has(code)) code = generateCode();

    const nextCodes = {
      ...state.activationCodesBySession,
      [sessionId]: [...(state.activationCodesBySession[sessionId] ?? []), code],
    };
    saveHandyState(nextCodes, state.devicesBySession);
    set({ activationCodesBySession: nextCodes });
    return code;
  },
  connectDevice: (activationCode, staffName) => {
    const code = activationCode.trim().toUpperCase();
    const sessionId = Object.keys(get().activationCodesBySession).find((id) =>
      get().activationCodesBySession[id].includes(code),
    );
    if (!sessionId || !staffName.trim()) return null;

    const device: StaffDevice = {
      id: `device-${sessionId}-${Date.now()}`,
      sessionId,
      activationCode: code,
      staffName: staffName.trim(),
      connectedAt: new Date().toISOString(),
      status: "active",
    };
    const nextDevices = {
      ...get().devicesBySession,
      [sessionId]: [...(get().devicesBySession[sessionId] ?? []), device],
    };
    const login: HandyLoginState = {
      sessionId,
      staffName: device.staffName,
      activationCode: code,
      deviceId: device.id,
    };
    saveHandyState(get().activationCodesBySession, nextDevices);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(handyLoginKey, JSON.stringify(login));
    }
    set({ devicesBySession: nextDevices, handyLogin: login });
    return device;
  },
  kickDevice: (sessionId, deviceId) => {
    const nextDevices = {
      ...get().devicesBySession,
      [sessionId]: (get().devicesBySession[sessionId] ?? []).map((device) =>
        device.id === deviceId ? { ...device, status: "kicked" as const } : device,
      ),
    };
    saveHandyState(get().activationCodesBySession, nextDevices);
    set({ devicesBySession: nextDevices });
  },
  getDevice: (sessionId, deviceId) =>
    (get().devicesBySession[sessionId] ?? []).find((device) => device.id === deviceId),
  clearHandyLogin: () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(handyLoginKey);
    set({ handyLogin: null });
  },
}));
