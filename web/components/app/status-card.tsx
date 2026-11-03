"use client";

import { Check, ChevronRight, Copy, Download, X } from "lucide-react";
import { useState } from "react";

import { AnimatedCounter } from "@/components/ui/animated-counter";
import { downloadText, redactedFileName } from "@/lib/anonymize";
import { cn } from "@/lib/utils";

import { useApp } from "./app-context";

export function StatusCard() {
  const { lastRedaction, setLastRedaction } = useApp();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!lastRedaction) return null;

  const { fileName, entities, redacted } = lastRedaction;

  async function copy() {
    try {
      await navigator.clipboard.writeText(redacted);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="animate-pop overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="truncate text-[12px] font-medium text-foreground">{fileName}</span>
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
            <AnimatedCounter value={entities} className="text-[10.5px]" />
            PII
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => downloadText(redactedFileName(fileName), redacted)}
            className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Download className="size-3" />
            Download
          </button>
          <button
            type="button"
            onClick={() => setLastRedaction(null)}
            aria-label="Dismiss"
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
      {open ? (
        <pre className="max-h-56 overflow-auto border-t border-border bg-background/80 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">
          {redacted}
        </pre>
      ) : null}
    </div>
  );
}
