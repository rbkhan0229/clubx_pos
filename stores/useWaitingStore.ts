"use client";

import { create } from "zustand";
import { broadcastClubxSync } from "@/lib/localSync";
import type { WaitingSite } from "@/types";

type WaitingState = {
  sitesBySession: Record<string, WaitingSite[]>;
  sitesById: Record<string, WaitingSite>;
  loadWaitingSites: () => void;
  createWaitingSite: (sessionId: string) => WaitingSite;
  getWaitingSiteById: (waitingSiteId: string) => WaitingSite | undefined;
};

const waitingSitesKey = "clubx-pos:waiting-sites";

function readSites() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(waitingSitesKey);
  return raw ? (JSON.parse(raw) as WaitingSite[]) : [];
}

function saveSites(sites: WaitingSite[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(waitingSitesKey, JSON.stringify(sites));
  broadcastClubxSync({ store: "waiting" });
}

function groupSites(sites: WaitingSite[]) {
  return sites.reduce<Record<string, WaitingSite[]>>((next, site) => {
    next[site.sessionId] = [...(next[site.sessionId] ?? []), site];
    return next;
  }, {});
}

function indexSites(sites: WaitingSite[]) {
  return sites.reduce<Record<string, WaitingSite>>((next, site) => {
    next[site.id] = site;
    return next;
  }, {});
}

export const useWaitingStore = create<WaitingState>((set, get) => ({
  sitesBySession: {},
  sitesById: {},
  loadWaitingSites: () => {
    const sites = readSites();
    set({
      sitesBySession: groupSites(sites),
      sitesById: indexSites(sites),
    });
  },
  createWaitingSite: (sessionId) => {
    const current = readSites();
    const existing = current.find((site) => site.sessionId === sessionId);
    if (existing) {
      set({
        sitesBySession: groupSites(current),
        sitesById: indexSites(current),
      });
      return existing;
    }
    const site: WaitingSite = {
      id: `wait-${sessionId}-${Date.now().toString(36)}`,
      sessionId,
      createdAt: new Date().toISOString(),
      urlPath: "",
    };
    const nextSite = { ...site, urlPath: `/waiting/${site.id}` };
    const next = [...current, nextSite];
    saveSites(next);
    set({
      sitesBySession: groupSites(next),
      sitesById: indexSites(next),
    });
    return nextSite;
  },
  getWaitingSiteById: (waitingSiteId) => {
    const current = get().sitesById[waitingSiteId];
    if (current) return current;
    const sites = readSites();
    const found = sites.find((site) => site.id === waitingSiteId);
    if (found) {
      set({
        sitesBySession: groupSites(sites),
        sitesById: indexSites(sites),
      });
    }
    return found;
  },
}));
