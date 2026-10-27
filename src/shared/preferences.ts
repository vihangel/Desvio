import { useSyncExternalStore } from "react";
// Per-visitor accessibility preferences, kept in this browser only.
export type TextSize = "normal" | "large" | "xlarge";
export interface Preferences {
  textSize: TextSize;
  highContrast: boolean;
  easyReading: boolean;
  // Videos in the 3D museum start muted until the visitor turns sound on.
  sound: boolean;
  libras: boolean;
}
export const DEFAULT_PREFERENCES: Preferences = {
  textSize: "normal",
  highContrast: false,
  easyReading: false,
  sound: false,
  libras: false,
};
const KEY = "desvio:preferences:v1";
function read(): Preferences {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const saved = JSON.parse(raw) as Partial<Preferences>;
    return {
      textSize: ["normal", "large", "xlarge"].includes(saved.textSize ?? "")
        ? (saved.textSize as TextSize)
        : "normal",
      highContrast: saved.highContrast === true,
      easyReading: saved.easyReading === true,
      sound: saved.sound === true,
      libras: saved.libras === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
let current: Preferences =
  typeof window === "undefined" ? DEFAULT_PREFERENCES : read();
const listeners = new Set<() => void>();
export const preferences = {
  get: () => current,
  set(patch: Partial<Preferences>) {
    current = { ...current, ...patch };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      // Private mode or blocked storage: the choice lasts for this visit.
    }
    listeners.forEach((listener) => listener());
  },
  reset() {
    preferences.set(DEFAULT_PREFERENCES);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
export function usePreferences() {
  return useSyncExternalStore(
    preferences.subscribe,
    preferences.get,
    () => DEFAULT_PREFERENCES,
  );
}
// Mirrors the preferences on <html> so stylesheets can react to them.
export function applyPreferences(
  prefs: Preferences,
  root = document.documentElement,
) {
  root.dataset.textSize = prefs.textSize;
  root.dataset.contrast = prefs.highContrast ? "high" : "normal";
  root.dataset.reading = prefs.easyReading ? "easy" : "normal";
}
