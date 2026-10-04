"use client";

import { useSyncExternalStore } from "react";
import {
  APPEARANCE_PREFS,
  type AppearancePref,
  type AppearanceValue,
} from "@/lib/appearance";

export type { Appearance, FontChoice, TextSize } from "@/lib/appearance";

const listeners = new Set<() => void>();

function read<P extends AppearancePref>(pref: P): AppearanceValue<P> {
  const { key, values, fallback } = APPEARANCE_PREFS[pref];
  try {
    const saved = window.localStorage.getItem(key);
    return (values as readonly string[]).includes(saved ?? "")
      ? (saved as AppearanceValue<P>)
      : fallback;
  } catch {
    return fallback;
  }
}

/** The default clears the attribute, so the stylesheet's own default applies. */
function apply(pref: AppearancePref, value: string) {
  const { attr, fallback } = APPEARANCE_PREFS[pref];
  if (value === fallback) document.documentElement.removeAttribute(attr);
  else document.documentElement.setAttribute(attr, value);
}

export function setAppearancePref<P extends AppearancePref>(pref: P, value: AppearanceValue<P>) {
  const { key, fallback } = APPEARANCE_PREFS[pref];
  try {
    if (value === fallback) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice still applies until the tab closes.
  }
  apply(pref, value);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed one of them.
  const onStorage = () => {
    for (const pref of Object.keys(APPEARANCE_PREFS) as AppearancePref[]) {
      apply(pref, read(pref));
    }
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** One of this device's appearance choices. */
export function useAppearancePref<P extends AppearancePref>(pref: P): AppearanceValue<P> {
  return useSyncExternalStore(
    subscribe,
    () => read(pref),
    () => APPEARANCE_PREFS[pref].fallback,
  );
}
