import type { Conversation } from "@/components/app/app-context";

export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c_${Math.random().toString(36).slice(2, 10)}`;
}

export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

export function emptyConversation(title = "New chat"): Conversation {
  return { id: uid(), title, messages: [], createdAt: Date.now() };
}
