import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "nemo-theme";
const listeners = new Set<() => void>();

function current(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

let theme: Theme = current();

function apply(next: Theme, persist: boolean) {
  theme = next;
  const root = document.documentElement;
  root.classList.toggle("dark", next === "dark");
  root.classList.toggle("light", next === "light");
  root.style.colorScheme = next;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked: keep the in-memory choice */
    }
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "dark" ? "#090909" : "#f4f4f1");
  for (const listener of listeners) listener();
}

export function setTheme(next: Theme) {
  apply(next, true);
}

export function toggleTheme() {
  apply(theme === "dark" ? "light" : "dark", true);
}

export function useTheme() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => theme,
    () => "dark" as const,
  );
}

if (typeof document !== "undefined") {
  apply(theme, false);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    apply(event.newValue === "light" ? "light" : "dark", false);
  });
}
