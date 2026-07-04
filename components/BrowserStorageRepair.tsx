"use client";

import { useEffect } from "react";

const repairKey = "workwear-browser-storage-repair-v1";

export function BrowserStorageRepair() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(repairKey)) {
        return;
      }
      sessionStorage.setItem(repairKey, "done");
    } catch {
      // Continue the repair even when browser privacy settings block sessionStorage.
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);
    }

    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => undefined);
    }
  }, []);

  return null;
}
