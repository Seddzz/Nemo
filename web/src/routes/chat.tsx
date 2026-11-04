import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Composer } from "@/components/composer";
import {
  Conversation,
  ConversationBubble,
  ConversationContent,
} from "@/components/ui/conversation";
import { anonymize, restore, type Hit } from "@/lib/anonymize";
import { relayChat } from "@/lib/relay";
import { takeDraft } from "@/lib/draft";
import { useVault } from "@/lib/store";

export const Route = createFileRoute("/chat")({ component: Relay });

// Entrance used by the Kobra Conversation demo: rise 8px out of a 4px blur.
const EASE = [0.22, 1, 0.36, 1] as const;
const ENTER_FROM = { opacity: 0, y: 8, filter: "blur(4px)" };
const ENTER_TO = { opacity: 1, y: 0, filter: "blur(0px)" };

function Relay() {
  const threads = useVault((s) => s.threads);
  const activeId = useVault((s) => s.activeId);
  const pushMessage = useVault((s) => s.pushMessage);
  const record = useVault((s) => s.record);
  const remember = useVault((s) => s.remember);
  const ledger = useVault((s) => s.ledger);
  const apiKey = useVault((s) => s.apiKey);
  const provider = useVault((s) => s.provider);
  const model = useVault((s) => s.model);
  const baseUrl = useVault((s) => s.baseUrl);
  const restoreReplies = useVault((s) => s.restoreReplies);

  const thread = threads.find((t) => t.id === activeId) ?? threads[0];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState(false);

  async function send(content: string) {
    if (!content || !thread || busy) return;
    setError("");
    const { text: masked, hits } = anonymize(content, useVault.getState().ledger, useVault.getState().strict);
    const fresh = hits.filter((h) => !ledger.some((p) => p.token === h.token && p.value === h.value));
    const added = hits.filter((h) => content.includes(h.value));
    remember(hits);
    const userMsg = {
      id: Math.random().toString(36).slice(2, 10),
      role: "user" as const,
      content,
      masked,
      hits: added,
    };
    pushMessage(thread.id, userMsg);
    record(
      {
        kind: "chat",
        title: content.replace(/\s+/g, " ").slice(0, 48),
        entities: fresh.length || added.length,
      },
      fresh.length || added.length,
    );

    const history = [...thread.messages, userMsg];
    if (apiKey.trim().length < 8) {
      pushMessage(thread.id, {
        id: Math.random().toString(36).slice(2, 10),
        role: "assistant",
        held: true,
        content:
          "Nothing was sent. Add a key and this redacted transcript is the only text your model will receive.",
        masked,
      });
      return;
    }

    setBusy(true);
    try {
      const result = await relayChat({
        data: {
          provider,
          apiKey: apiKey.trim(),
          model,
          baseUrl: baseUrl || "https://api.openai.com/v1",
          messages: history.map((m) => ({
            role: m.role,
            content: m.role === "user" ? m.masked || m.content : m.masked || m.content,
          })),
        },
      });
      if (!result.ok) {
        setError(result.error);
        pushMessage(thread.id, {
          id: Math.random().toString(36).slice(2, 10),
          role: "assistant",
          content: result.error,
          held: true,
        });
      } else {
        const shown = restoreReplies ? restore(result.text, [...ledger, ...hits]) : result.text;
        pushMessage(thread.id, {
          id: Math.random().toString(36).slice(2, 10),
          role: "assistant",
          content: shown,
          masked: result.text,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const q = takeDraft();
    if (q) void send(q);
    // only consume a draft queued from the home composer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empty = !thread || thread.messages.length === 0;

  // Messages already in the thread when it opens render in place; only new ones animate in.
  const reduce = useReducedMotion() ?? false;
  const known = useRef<{ thread?: string; ids: Set<string> }>({ ids: new Set() });
  if (known.current.thread !== thread?.id) {
    known.current = { thread: thread?.id, ids: new Set(thread?.messages.map((m) => m.id)) };
  }
  const fresh = (id: string) => !known.current.ids.has(id);
  const enter = (skip: boolean) => ({
    layout: !reduce,
    initial: skip || reduce ? false : ENTER_FROM,
    animate: ENTER_TO,
    transition: { duration: 0.32, ease: EASE, layout: { type: "spring" as const, duration: 0.5, bounce: 0 } },
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex h-12 items-center justify-center px-4">
        {!empty && (
          <div className="truncate text-sm text-muted">{thread.title}</div>
        )}
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="absolute right-4 text-xs text-faint hover:text-fg"
        >
          {reveal ? "Hide originals" : "Originals"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center pb-16">
            <h1 className="text-center text-6xl font-medium tracking-[-0.045em] sm:text-7xl md:text-[5.5rem]">
              Nemo
            </h1>
            <p className="mt-5 max-w-md text-center text-sm leading-relaxed text-muted">
              Ask a question, paste a note, or point at a file. Sensitive spans are stripped
              before anything reaches your model.
            </p>
          </div>
        ) : (
          <Conversation className="mx-auto max-w-3xl gap-3 py-6">
            {thread.messages.map((m) =>
              m.role === "user" ? (
                <ConversationBubble key={m.id} align="end" variant="default" sentAt={time(m.at)}>
                  <ConversationContent render={<motion.div {...enter(!fresh(m.id))} />}>
                    <p className="whitespace-pre-wrap">
                      {reveal ? m.content : m.masked || m.content}
                    </p>
                    {m.hits && uniqueHits(m.hits).length > 0 && (
                      <p className="mt-2 text-[11px] opacity-70">
                        {uniqueHits(m.hits)
                          .map((h) => (reveal ? `${h.kind} ${h.value}` : h.token))
                          .join("  ")}
                      </p>
                    )}
                  </ConversationContent>
                </ConversationBubble>
              ) : (
                <ConversationBubble key={m.id} align="start" variant="muted" sentAt={time(m.at)}>
                  <ConversationContent render={<motion.div {...enter(!fresh(m.id))} />}>
                    {m.held && <div className="mb-1 text-[11px] opacity-60">Held locally</div>}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </ConversationContent>
                </ConversationBubble>
              ),
            )}
            <AnimatePresence initial={false}>
              {busy && (
                <ConversationBubble key="thinking" align="start" variant="muted">
                  <ConversationContent
                    render={
                      <motion.div
                        {...enter(false)}
                        exit={{ opacity: 0, filter: "blur(4px)" }}
                        aria-label={`Waiting on ${model}`}
                      />
                    }
                  >
                    <span className="t-msg-dots" role="status">
                      <span className="sr-only">Thinking</span>
                      <span aria-hidden className="t-msg-dot [--msg-dot-index:0]" />
                      <span aria-hidden className="t-msg-dot [--msg-dot-index:1]" />
                      <span aria-hidden className="t-msg-dot [--msg-dot-index:2]" />
                    </span>
                  </ConversationContent>
                </ConversationBubble>
              )}
            </AnimatePresence>
            {error && <p className="text-sm text-danger">{error}</p>}
          </Conversation>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <Composer onSend={(text) => void send(text)} busy={busy} />
      </div>
    </div>
  );
}

function uniqueHits(hits: Hit[]) {
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.token)) return false;
    seen.add(h.token);
    return true;
  });
}

function time(at?: number) {
  return at ? new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : undefined;
}
