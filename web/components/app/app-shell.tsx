"use client";

import { Menu, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  AppContext,
  DEFAULT_SETTINGS,
  type AppContextValue,
  type ChatSettings,
  type Conversation,
  type RedactionSummary,
} from "./app-context";
import { SettingsModal } from "./settings-modal";
import { Sidebar } from "./sidebar";
import { UploadModal } from "./upload-modal";

const CONVERSATIONS_KEY = "nemo.chats.v1";
const ACTIVE_KEY = "nemo.chat.active.v1";
const SETTINGS_KEY = "nemo.settings.v1";

const TITLES: Record<string, string> = {
  "/": "Anonymize",
  "/chat": "Chat",
  "/docs": "Docs",
};

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY) || null;
  } catch {
    return null;
  }
}

function loadSettings(): ChatSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ChatSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [lastRedaction, setLastRedaction] = useState<RedactionSummary | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConversations(loadConversations());
    setActiveId(loadActiveId());
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch {
      // storage unavailable
    }
  }, [conversations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(ACTIVE_KEY, activeId ?? "");
    } catch {
      // ignore
    }
  }, [activeId, hydrated]);

  const saveSettings = useCallback((next: ChatSettings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      conversations,
      activeId,
      settings,
      lastRedaction,
      setConversations,
      setActiveId,
      saveSettings,
      setLastRedaction,
      openUpload: () => setUploadOpen(true),
      openSettings: () => setSettingsOpen(true),
    }),
    [conversations, activeId, settings, lastRedaction, saveSettings],
  );

  const title = TITLES[pathname] ?? "Nemo";

  return (
    <AppContext.Provider value={value}>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(200,255,0,0.055),transparent_72%)]"
          />
          <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium tracking-tight">{title}</span>
              <span className="hidden text-[11px] text-muted-foreground/60 sm:inline">
                workspace
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <a
                href="https://github.com/Seddzz/Nemo"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
                </svg>
              </a>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Settings className="size-4" />
              </button>
            </div>
          </header>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </main>

        {uploadOpen ? <UploadModal onClose={() => setUploadOpen(false)} /> : null}
        {settingsOpen ? (
          <SettingsModal
            settings={settings}
            onClose={() => setSettingsOpen(false)}
            onSave={saveSettings}
          />
        ) : null}
      </div>
    </AppContext.Provider>
  );
}
