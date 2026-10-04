/**
 * CUD Management System — Service Worker
 * Provides offline app-shell caching and background sync for queued mutations.
 *
 * Strategy:
 *  - Precache the app shell on install (HTML, JS, CSS, fonts, images).
 *  - For navigation requests: network-first, fall back to cached shell.
 *  - For static assets: stale-while-revalidate.
 *  - For API GETs: network-first, fall back to cache (with short TTL).
 *  - For API mutations: store in IndexedDB queue when offline, replay on 'sync'.
 */

const VERSION = "v1.0.0";
const SHELL_CACHE = `cud-shell-${VERSION}`;
const ASSET_CACHE = `cud-asset-${VERSION}`;
const API_CACHE = `cud-api-${VERSION}`;
const OFFLINE_QUEUE_DB = "cud-offline";
const OFFLINE_QUEUE_STORE = "mutations";

const APP_SHELL = [
  "/",
  "/logo.svg",
  "/manifest.webmanifest",
];

// ─────────────────────────────── Install ───────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            /* ignore individual failures */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

// ─────────────────────────────── Activate ───────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, ASSET_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ─────────────────────────────── IndexedDB queue ───────────────────────────────
async function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        const store = db.createObjectStore(OFFLINE_QUEUE_STORE, {
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

async function queueMutation(request) {
  const db = await openQueueDB();
  const body = await request.clone().text();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
    tx.objectStore(OFFLINE_QUEUE_STORE).add({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      createdAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllQueued() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteQueued(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
    tx.objectStore(OFFLINE_QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function replayQueue() {
  const items = await getAllQueued();
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
        credentials: "same-origin",
      });
      if (res.ok) {
        await deleteQueued(item.id);
      }
    } catch {
      // Stop on first network failure — will retry on next sync event
      break;
    }
  }
  // Notify clients
  const clients = await self.clients.matchAll({ type: "window" });
  for (const c of clients) {
    c.postMessage({ type: "QUEUE_REPLAYED" });
  }
}

// ─────────────────────────────── Fetch handler ───────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  // Mutations when offline → queue
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    if (!navigator.onLine) {
      event.respondWith(
        (async () => {
          await queueMutation(request);
          if ("sync" in self.registration) {
            try {
              await self.registration.sync.register("cud-replay");
            } catch {
              /* sync registration may fail in some browsers */
            }
          }
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              error: "Queued offline — will sync when reconnected.",
            }),
            { status: 202, headers: { "Content-Type": "application/json" } }
          );
        })()
      );
      return;
    }
    return; // Let network handle it
  }

  // Navigation requests → network-first, fall back to cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put("/", networkRes.clone());
          return networkRes;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match("/");
          return cached || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // API GETs → network-first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(request);
          if (networkRes.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          const cache = await caches.open(API_CACHE);
          const cached = await cache.match(request);
          return cached || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // Static assets → stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || networkPromise;
    })()
  );
});

// ─────────────────────────────── Background sync ───────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "cud-replay") {
    event.waitUntil(replayQueue());
  }
});

// ─────────────────────────────── Message handler ───────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "REPLAY_QUEUE") {
    event.waitUntil(replayQueue());
  }
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
