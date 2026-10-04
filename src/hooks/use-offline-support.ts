"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

interface OfflineState {
  online: boolean;
  pendingCount: number;
  lastSync: Date | null;
  syncNow: () => Promise<void>;
}

/**
 * Hook that registers the service worker, tracks online/offline state,
 * monitors the offline mutation queue, and exposes a manual sync trigger.
 */
export function useOfflineSupport(): OfflineState {
  const { t } = useI18n();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const refreshCountRef = useRef<() => Promise<void>>(async () => {});

  const refreshCount = useCallback(async () => {
    try {
      const db = await openQueueDB();
      const tx = db.transaction("mutations", "readonly");
      const count = await new Promise<number>((resolve, reject) => {
        const req = tx.objectStore("mutations").count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      setPendingCount(count);
    } catch {
      /* SW not yet ready — ignore */
    }
  }, []);

  // Keep ref in sync (must be inside effect, not during render)
  useEffect(() => {
    refreshCountRef.current = refreshCount;
  }, [refreshCount]);

  // Register SW on mount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[SW] registration failed:", err);
        });
    }
  }, []);

  // Track online/offline
  useEffect(() => {
    const update = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "REPLAY_QUEUE" });
          toast.success(t("network.backOnline"));
        }
      } else {
        toast.warning(t("network.connectionLost"), {
          description: t("network.offlineModeDesc"),
        });
      }
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    // Initial sync via microtask to avoid setState-in-effect
    Promise.resolve().then(() => setOnline(navigator.onLine));
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [t]);

  // Listen for SW messages (queue replayed)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "QUEUE_REPLAYED") {
        setPendingCount(0);
        setLastSync(new Date());
        toast.success(t("network.syncComplete"));
        void refreshCountRef.current();
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [t]);

  // Poll queue count
  useEffect(() => {
    let active = true;
    const tick = () => { if (active) refreshCount(); };
    tick();
    const interval = setInterval(tick, 10_000);
    return () => { active = false; clearInterval(interval); };
  }, [refreshCount]);

  const syncNow = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
    if (!navigator.onLine) {
      toast.warning(t("network.offline"));
      return;
    }
    navigator.serviceWorker.controller.postMessage({ type: "REPLAY_QUEUE" });
  }, [t]);

  return { online, pendingCount, lastSync, syncNow };
}

function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("cud-offline", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("mutations")) {
        const store = db.createObjectStore("mutations", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
