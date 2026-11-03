"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";

type ComposerProps = {
  onSend: (text: string) => void;
  onAttach: () => void;
  busy: boolean;
  model: string;
};

export function Composer({ onSend, onAttach, busy, model }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [value]);

  function send() {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-2.5 transition-colors focus-within:border-primary/40">
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Ask Nemo…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        aria-label="Message Nemo"
        className="max-h-40 min-h-6 w-full resize-none bg-transparent px-1.5 py-1 text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onAttach}
            aria-label="Attach a document"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Paperclip className="size-3.5" />
          </button>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground">
            Nemo
          </span>
          {model ? (
            <span className="max-w-[150px] truncate rounded-full border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground/70">
              {model}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={send}
          disabled={busy || !value.trim()}
          aria-label="Send message"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-25"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  );
}
