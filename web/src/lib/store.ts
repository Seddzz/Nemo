import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Hit } from "@/lib/anonymize";
import { providerInfo, type Provider } from "@/lib/models";

export type { Provider } from "@/lib/models";

export type KeySettings = {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
  restoreReplies: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  masked?: string;
  hits?: Hit[];
  held?: boolean;
  at?: number;
};

export type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

export type Activity = {
  id: string;
  kind: "chat" | "document";
  title: string;
  entities: number;
  at: number;
};

type State = {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
  restoreReplies: boolean;
  strict: boolean;
  threads: Thread[];
  activeId: string;
  documents: number;
  entities: number;
  messagesRouted: number;
  activity: Activity[];
  ledger: Hit[];
  sampleData: boolean;
  setSampleData: (v: boolean) => void;
  saveKey: (settings: KeySettings) => void;
  renameThread: (id: string, title: string) => void;
  deleteThread: (id: string) => void;
  setProvider: (p: Provider) => void;
  setApiKey: (k: string) => void;
  setModel: (m: string) => void;
  setBaseUrl: (u: string) => void;
  setRestoreReplies: (v: boolean) => void;
  setStrict: (v: boolean) => void;
  newThread: () => void;
  selectThread: (id: string) => void;
  pushMessage: (threadId: string, message: ChatMessage) => void;
  record: (entry: Omit<Activity, "id" | "at">, entityDelta: number, doc?: boolean) => void;
  remember: (hits: Hit[]) => void;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function blankThread(): Thread {
  return {
    id: uid(),
    title: "New conversation",
    updatedAt: Date.now(),
    messages: [],
  };
}

const first = blankThread();

export const useVault = create<State>()(
  persist(
    (set) => ({
      provider: "openai",
      apiKey: "",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1",
      restoreReplies: true,
      strict: true,
      threads: [first],
      activeId: first.id,
      documents: 0,
      entities: 0,
      messagesRouted: 0,
      activity: [],
      ledger: [],
      sampleData: true,
      setSampleData: (sampleData) => set({ sampleData }),
      saveKey: (settings) => set({ ...settings, apiKey: settings.apiKey.trim() }),
      renameThread: (id, title) =>
        set((s) => ({
          threads: s.threads.map((t) => (t.id === id ? { ...t, title: title.trim() || t.title } : t)),
        })),
      deleteThread: (id) =>
        set((s) => {
          const rest = s.threads.filter((t) => t.id !== id);
          if (rest.length === 0) {
            const t = blankThread();
            return { threads: [t], activeId: t.id };
          }
          return { threads: rest, activeId: s.activeId === id ? rest[0].id : s.activeId };
        }),
      setProvider: (provider) =>
        set(() => {
          const info = providerInfo(provider);
          return { provider, model: info.models[0] ?? "gpt-4o-mini", baseUrl: info.baseUrl };
        }),
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setRestoreReplies: (restoreReplies) => set({ restoreReplies }),
      setStrict: (strict) => set({ strict }),
      newThread: () =>
        set((s) => {
          const t = blankThread();
          return { threads: [t, ...s.threads].slice(0, 24), activeId: t.id };
        }),
      selectThread: (id) => set({ activeId: id }),
      pushMessage: (threadId, message) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const title =
              t.messages.length === 0 && message.role === "user"
                ? message.content.replace(/\s+/g, " ").slice(0, 42)
                : t.title;
            return {
              ...t,
              title: title || t.title,
              updatedAt: Date.now(),
              messages: [...t.messages, { ...message, at: message.at ?? Date.now() }],
            };
          }),
        })),
      record: (entry, entityDelta, doc) =>
        set((s) => ({
          documents: s.documents + (doc ? 1 : 0),
          entities: s.entities + entityDelta,
          messagesRouted: s.messagesRouted + (entry.kind === "chat" ? 1 : 0),
          activity: [
            { ...entry, id: uid(), at: Date.now() },
            ...s.activity,
          ].slice(0, 500),
        })),
      remember: (hits) =>
        set((s) => {
          const map = new Map(s.ledger.map((h) => [`${h.kind}:${h.value}`, h]));
          for (const h of hits) map.set(`${h.kind}:${h.value}`, h);
          return { ledger: [...map.values()].slice(-200) };
        }),
    }),
    { name: "nemo-vault" },
  ),
);
