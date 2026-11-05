import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Composer, type ComposerPayload } from "@/components/composer";
import { MarkFileText, MarkIncognito, MarkPencil } from "@/components/marks";
import {
  Conversation,
  ConversationBubble,
  ConversationContent,
} from "@/components/ui/conversation";
import { anonymize, restore, type Hit } from "@/lib/anonymize";
import { relayChat } from "@/lib/relay";
import { takeDraft } from "@/lib/draft";
import { formatSize } from "@/lib/files";
import { useVault, type ChatAttachment, type ChatMessage } from "@/lib/store";

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
  const apiKey = useVault((s) => s.apiKey);
  const provider = useVault((s) => s.provider);
  const model = useVault((s) => s.model);
  const baseUrl = useVault((s) => s.baseUrl);
  const restoreReplies = useVault((s) => s.restoreReplies);
  const renameThread = useVault((s) => s.renameThread);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  const thread = threads.find((t) => t.id === activeId) ?? threads[0];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const [ephemeral, setEphemeral] = useState<ChatMessage[]>([]);

  async function send(draft: ComposerPayload) {
    const state = useVault.getState();
    const prompt = draft.text.trim();
    if ((!prompt && draft.attachments.length === 0) || busy) return;
    if (!incognito && !thread) return;
    setError("");

    const maskPrompt = draft.anonymize && (state.anonymizeScope === "both" || state.anonymizeScope === "text");
    const maskFiles = draft.anonymize && (state.anonymizeScope === "both" || state.anonymizeScope === "file");

    let promptMasked = prompt;
    let promptHits: Hit[] = [];
    if (maskPrompt && prompt) {
      const result = anonymize(prompt, state.ledger, state.strict);
      promptMasked = result.text;
      promptHits = result.hits.filter((h) => prompt.includes(h.value));
    }

    const knownHits = [...state.ledger, ...promptHits];
    const files: ChatAttachment[] = draft.attachments.map((file) => {
      if (!maskFiles) {
        return { name: file.name, size: file.size, content: file.text };
      }
      const result = anonymize(file.text, knownHits, state.strict);
      const hits = result.hits.filter((h) => file.text.includes(h.value));
      knownHits.push(...hits);
      return {
        name: file.name,
        size: file.size,
        content: file.text,
        masked: result.text,
        hits,
      };
    });

    const allHits = [...promptHits, ...files.flatMap((file) => file.hits ?? [])];
    const fresh = allHits.filter(
      (hit, index) =>
        !state.ledger.some((prior) => prior.token === hit.token && prior.value === hit.value) &&
        allHits.findIndex((h) => h.token === hit.token && h.value === hit.value) === index,
    );
    const seed = prompt || files[0]?.name || "";
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2, 10),
      role: "user",
      content: prompt,
      masked: promptMasked,
      hits: allHits,
      attachments: files.length > 0 ? files : undefined,
    };
    const history = incognito
      ? [...ephemeral, userMsg]
      : thread
        ? [...thread.messages, userMsg]
        : [userMsg];

    if (incognito) {
      setEphemeral((prev) => [...prev, userMsg]);
    } else if (thread) {
      pushMessage(thread.id, userMsg);
      remember(allHits);
      record(
        {
          kind: "chat",
          title: seed.replace(/\s+/g, " ").slice(0, 48) || "Attached file",
          entities: allHits.length,
        },
        fresh.length,
      );
    }

    if (apiKey.trim().length < 8) {
      const held: ChatMessage = {
        id: Math.random().toString(36).slice(2, 10),
        role: "assistant",
        held: true,
        content:
          "Nothing was sent. Add a key and this anonymized transcript is the only text your model will receive.",
        masked: promptMasked,
      };
      if (incognito) setEphemeral((prev) => [...prev, held]);
      else if (thread) pushMessage(thread.id, held);
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
            content: wire(m),
          })),
        },
      });
      if (!result.ok) {
        setError(result.error);
        const held: ChatMessage = {
          id: Math.random().toString(36).slice(2, 10),
          role: "assistant",
          content: result.error,
          held: true,
        };
        if (incognito) setEphemeral((prev) => [...prev, held]);
        else if (thread) pushMessage(thread.id, held);
      } else {
        const shown = restoreReplies
          ? restore(result.text, [...state.ledger, ...allHits])
          : result.text;
        const reply: ChatMessage = {
          id: Math.random().toString(36).slice(2, 10),
          role: "assistant",
          content: shown,
          masked: result.text,
        };
        if (incognito) setEphemeral((prev) => [...prev, reply]);
        else if (thread) pushMessage(thread.id, reply);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const draft = takeDraft();
    if (draft) void send(draft);
    // only consume a draft queued from the home composer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = incognito ? ephemeral : (thread?.messages ?? []);
  const empty = messages.length === 0;

  // Messages already in the thread when it opens render in place; only new ones animate in.
  const reduce = useReducedMotion() ?? false;
  const conversationKey = incognito ? "__incognito__" : thread?.id;
  const known = useRef<{ thread?: string; ids: Set<string> }>({ ids: new Set() });
  if (known.current.thread !== conversationKey) {
    known.current = { thread: conversationKey, ids: new Set(messages.map((m) => m.id)) };
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
        {!incognito && !empty && thread && (
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (titleInput.trim()) renameThread(thread.id, titleInput);
                  setEditingTitle(false);
                }}
              >
                <input
                  autoFocus
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={() => setEditingTitle(false)}
                  className="bg-surface px-2 py-0.5 text-sm font-bold text-fg outline-none rounded border border-line"
                />
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold text-fg">{thread.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTitleInput(thread.title);
                    setEditingTitle(true);
                  }}
                  className="text-muted hover:text-fg"
                  title="Rename conversation"
                >
                  <MarkPencil className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
        <div className="absolute right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIncognito((v) => !v);
              setEphemeral([]);
              setError("");
            }}
            aria-pressed={incognito}
            title="Incognito chat — messages are not saved"
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition-colors ${
              incognito ? "bg-raised text-fg" : "text-faint hover:text-fg"
            }`}
          >
            <MarkIncognito className="size-3.5" />
            <span className="hidden sm:inline">Incognito</span>
          </button>
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="text-xs text-faint hover:text-fg"
          >
            {reveal ? "Hide originals" : "Originals"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center pb-16">
            {incognito && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[11px] text-muted">
                <MarkIncognito className="size-3.5" /> Incognito
              </span>
            )}
            <p className="mt-5 max-w-md text-center text-sm leading-relaxed text-muted">
              {incognito
                ? "This conversation stays in this tab and is never saved."
                : "Ask a question, paste a note, or point at a file. Sensitive spans are stripped before anything reaches your model."}
            </p>
          </div>
        ) : (
          <Conversation className="mx-auto max-w-3xl gap-3 py-6">
            {messages.map((m) =>
              m.role === "user" ? (
                <ConversationBubble key={m.id} align="end" variant="default" sentAt={time(m.at)}>
                  <ConversationContent render={<motion.div {...enter(!fresh(m.id))} />}>
                    {(m.content || m.masked) && (
                      <p className="whitespace-pre-wrap">
                        {reveal ? m.content : m.masked || m.content}
                      </p>
                    )}
                    {m.attachments?.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="mt-1.5 flex items-center gap-1.5 rounded-md border border-current/15 px-2 py-1 text-[11px]"
                      >
                        <MarkFileText className="size-3.5 shrink-0 opacity-70" />
                        <span className="max-w-44 truncate">{file.name}</span>
                        <span className="shrink-0 opacity-60">{formatSize(file.size)}</span>
                      </div>
                    ))}
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
        <Composer onSend={(draft) => void send(draft)} busy={busy} />
      </div>
    </div>
  );
}

function wire(message: ChatMessage) {
  const text = message.masked || message.content;
  if (message.role === "user" && message.attachments?.length) {
    const files = message.attachments
      .map((file) => `--- ${file.name} ---\n${file.masked || file.content}`)
      .join("\n\n");
    return [text, files].filter(Boolean).join("\n\n").slice(0, 60000);
  }
  return text.slice(0, 60000);
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
