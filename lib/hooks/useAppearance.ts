"use client";

import { useSyncExternalStore } from "react";
import { APPEARANCE_KEY, type Appearance } from "@/lib/appearance";

export type { Appearance };

const listeners = new Set<() => void>();

function read(): Appearance {
  try {
    const saved = window.localStorage.getItem(APPEARANCE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/** "system" clears the override, so the palette follows the device again. */
function applyAppearance(next: Appearance) {
  if (next === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", next);
}

export function setAppearance(next: Appearance) {
  try {
    if (next === "system") window.localStorage.removeItem(APPEARANCE_KEY);
    else window.localStorage.setItem(APPEARANCE_KEY, next);
  } catch {
    // Private mode: the choice still applies until the tab closes.
  }
  applyAppearance(next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== APPEARANCE_KEY) return;
    applyAppearance(read());
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** This device's light / dark choice. Saved in the browser, not on the account. */
export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, read, () => "system");
}
