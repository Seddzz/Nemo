"use client";

import { useState } from "react";

import { useApp, type ChatMessage } from "@/components/app/app-context";
import { StatusCard } from "@/components/app/status-card";
import { emptyConversation, titleFrom } from "@/lib/chat";

import { ChatMessages } from "./chat-messages";
import { Composer } from "./composer";

export function ChatView() {
  const {
    conversations,
    activeId,
    setConversations,
    setActiveId,
    settings,
    openUpload,
  } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversation = conversations.find((item) => item.id === activeId) ?? null;
  const messages = conversation?.messages ?? [];
  const greeting = settings.displayName
    ? `Hello, ${settings.displayName}. Share only what you need.`
    : "Share only what you need.";

  async function send(text: string) {
    if (busy) return;
    setError(null);
    setBusy(true);

    const userMessage: ChatMessage = { role: "user", content: text, at: Date.now() };
    let conversationId: string;
    let history: ChatMessage[];

    if (conversation) {
      conversationId = conversation.id;
      history = [...conversation.messages, userMessage];
      setConversations((previous) =>
        previous.map((item) =>
          item.id === conversation.id ? { ...item, messages: history } : item,
        ),
      );
    } else {
      const fresh = emptyConversation(titleFrom(text));
      conversationId = fresh.id;
      history = [userMessage];
      setConversations((previous) => [{ ...fresh, messages: history }, ...previous]);
      setActiveId(conversationId);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((message) => ({ role: message.role, content: message.content })),
          apiKey: settings.apiKey || undefined,
          model: settings.model || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }
      const reply: ChatMessage = {
        role: "assistant",
        content: data.reply ?? "(no response)",
        at: Date.now(),
      };
      setConversations((previous) =>
        previous.map((item) =>
          item.id === conversationId ? { ...item, messages: [...item.messages, reply] } : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ChatMessages
        messages={messages}
        busy={busy}
        error={error}
        onSuggest={send}
        onUpload={openUpload}
      />
      <div className="shrink-0 px-4 pb-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          <StatusCard />
          <Composer onSend={send} onAttach={openUpload} busy={busy} model={settings.model} />
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[11px] text-muted-foreground/70">{greeting}</p>
            <p className="text-[10.5px] text-muted-foreground/45">
              Redactions are one-way and stay on this device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
