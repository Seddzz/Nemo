"use client";

import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";

export type ChatMessage = { role: "user" | "assistant"; content: string; at: number };

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
};

export type ChatSettings = {
  displayName: string;
  engineUrl: string;
  apiKey: string;
  model: string;
};

export type RedactionSummary = {
  fileName: string;
  entities: number;
  redacted: string;
  at: number;
};

export type AppContextValue = {
  conversations: Conversation[];
  activeId: string | null;
  settings: ChatSettings;
  lastRedaction: RedactionSummary | null;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setActiveId: (id: string | null) => void;
  saveSettings: (next: ChatSettings) => void;
  setLastRedaction: (next: RedactionSummary | null) => void;
  openUpload: () => void;
  openSettings: () => void;
};

export const DEFAULT_SETTINGS: ChatSettings = {
  displayName: "",
  engineUrl: "http://localhost:8000",
  apiKey: "",
  model: "openai/gpt-oss-120b",
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppShell");
  return value;
}
