"use client";

import { useEffect, useRef } from "react";
import { FileUp } from "lucide-react";

import type { ChatMessage } from "@/components/app/app-context";
import { renderMarkdown } from "@/components/assistant";
import AiStatus from "@/components/ui/ai-status";
import FluidOrb from "@/components/ui/fluid-orb";
import { cn } from "@/lib/utils";

function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type ChatMessagesProps = {
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  onSuggest: (text: string) => void;
  onUpload: () => void;
};

export function ChatMessages({ messages, busy, error, onSuggest, onUpload }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  if (messages.length === 0 && !busy && !error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-6">
        <div className="orb-halo mb-5">
          <FluidOrb size={104} color="#c8ff00" />
        </div>
        <h2 className="font-brand text-2xl tracking-[0.06em] text-foreground">NEMO</h2>
        <p className="mt-2 max-w-xs text-center text-[12.5px] leading-relaxed text-muted-foreground">
          Ask about redaction, or drop a document to anonymize it.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onUpload}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3.5 text-[12px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <FileUp className="size-3.5" />
            Anonymize a document
          </button>
          <button
            type="button"
            onClick={() => onSuggest("What is Nemo?")}
            className="inline-flex h-8 items-center rounded-full border border-border px-3.5 text-[12px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            What is Nemo?
          </button>
          <button
            type="button"
            onClick={() => onSuggest("How do I redact a document?")}
            className="inline-flex h-8 items-center rounded-full border border-border px-3.5 text-[12px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            How do I redact a document?
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-col",
              message.role === "user" ? "items-end" : "items-start",
            )}
          >
            {message.role === "assistant" ? (
              <div className="md max-w-[95%]">
                {renderMarkdown(message.content)}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-br-md border border-border bg-secondary px-3.5 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap text-foreground">
                {message.content}
              </div>
            )}
            <span className="mt-1 text-[10.5px] text-muted-foreground/60">
              {clock(message.at)}
            </span>
          </div>
        ))}

        {busy ? (
          <div className="flex items-center">
            <AiStatus state="thinking" timer shimmer />
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-[12.5px] text-destructive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
