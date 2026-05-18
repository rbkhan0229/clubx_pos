"use client";

type SyncPayload = {
  source: string;
  sessionId?: string;
  store:
    | "tables"
    | "visits"
    | "orders"
    | "menu"
    | "payments"
    | "handy"
    | "reservations"
    | "waiting";
};

const channelName = "clubx-pos-sync";

function getSourceId() {
  if (typeof window === "undefined") return "server";
  const key = "clubx-pos:sync-source-id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = `source-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

export function broadcastClubxSync(payload: Omit<SyncPayload, "source">) {
  if (typeof window === "undefined") return;
  const message: SyncPayload = { ...payload, source: getSourceId() };

  // TODO: Replace BroadcastChannel/localStorage sync with server realtime sync later.
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(message);
    channel.close();
  }
  window.localStorage.setItem("clubx-pos:last-sync", JSON.stringify({ ...message, at: Date.now() }));
}

export function subscribeClubxSync(
  callback: (payload: Omit<SyncPayload, "source">) => void,
) {
  if (typeof window === "undefined") return () => {};

  const source = getSourceId();
  const handlePayload = (payload: SyncPayload) => {
    if (!payload || payload.source === source) return;
    callback({ sessionId: payload.sessionId, store: payload.store });
  };

  const channel =
    "BroadcastChannel" in window ? new BroadcastChannel(channelName) : null;
  if (channel) {
    channel.onmessage = (event) => handlePayload(event.data as SyncPayload);
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== "clubx-pos:last-sync" || !event.newValue) return;
    try {
      handlePayload(JSON.parse(event.newValue) as SyncPayload);
    } catch {
      // Ignore malformed local sync messages.
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    channel?.close();
    window.removeEventListener("storage", handleStorage);
  };
}
