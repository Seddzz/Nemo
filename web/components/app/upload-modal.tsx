"use client";

import { useRef, useState } from "react";
import { Check, Copy, Download, FileText, Upload, X } from "lucide-react";

import AiStatus from "@/components/ui/ai-status";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import {
  anonymizeFile,
  downloadText,
  redactedFileName,
  type AnonymizeResult,
} from "@/lib/anonymize";
import { cn } from "@/lib/utils";

import { useApp } from "./app-context";

type Phase = "idle" | "ready" | "working" | "result" | "error";

const MAX_BYTES = 10 * 1024 * 1024;

export function UploadModal({ onClose }: { onClose: () => void }) {
  const { setLastRedaction } = useApp();
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<"placeholder" | "fake">("placeholder");
  const [result, setResult] = useState<AnonymizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(next: File | null) {
    if (!next) return;
    if (next.size > MAX_BYTES) {
      setError("That file exceeds the 10 MB upload limit.");
      setPhase("error");
      return;
    }
    setFile(next);
    setResult(null);
    setError(null);
    setPhase("ready");
  }

  async function run() {
    if (!file) return;
    setPhase("working");
    setError(null);
    try {
      const data = await anonymizeFile(file, strategy);
      setResult(data);
      setLastRedaction({
        fileName: file.name,
        entities: data.entities.length,
        redacted: data.redacted,
        at: Date.now(),
      });
      setPhase("result");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setPhase("error");
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.redacted);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="animate-fade fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      onClick={phase === "working" ? undefined : onClose}
    >
      <div
        className="animate-pop w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Anonymize document"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <FileText className="size-4 text-primary" />
            Anonymize document
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5">
          {phase === "idle" ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                choose(event.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed px-5 py-11 text-center outline-none transition-colors",
                dragging
                  ? "border-primary bg-primary/[0.04]"
                  : "border-border hover:border-primary/50 hover:bg-secondary/30",
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-primary">
                <Upload className="size-4" />
              </span>
              <span className="text-[13px] font-medium text-foreground">
                Drop a document here
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                or click to browse Â· PDF, TXT Â· 10 MB max
              </span>
            </div>
          ) : null}

          {phase === "ready" && file ? (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12.5px] font-medium text-foreground">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPhase("idle");
                  }}
                  aria-label="Remove file"
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/40 p-1">
                {(["placeholder", "fake"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStrategy(option)}
                    className={cn(
                      "h-8 rounded-lg text-[12.5px] capitalize transition-colors",
                      strategy === option
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={run}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full bg-primary text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Anonymize
                <span className="size-1.5 rounded-full bg-primary-foreground" />
              </button>
            </>
          ) : null}

          {phase === "working" ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <AiStatus state="analyzing" label="Redacting" detail={file?.name} timer shimmer />
              <span className="text-[11.5px] text-muted-foreground">
                This stays on your device.
              </span>
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
              <p className="text-[12.5px] text-destructive">
                {error ?? "Something went wrong."}
              </p>
              <button
                type="button"
                onClick={() => setPhase(file ? "ready" : "idle")}
                className="h-8 w-fit rounded-lg border border-destructive/40 px-3 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                Try again
              </button>
            </div>
          ) : null}

          {phase === "result" && result ? (
            <>
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
                  <span className="truncate text-[12.5px] font-medium text-foreground">
                    {file?.name ?? "document"}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                    <AnimatedCounter value={result.entities.length} className="text-[10.5px]" />
                    PII
                  </span>
                  <div className="ml-auto flex shrink-0 items-center gap-0.5">
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
                      onClick={() =>
                        downloadText(redactedFileName(file?.name ?? "document.txt"), result.redacted)
                      }
                      className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Download className="size-3" />
                      Download
                    </button>
                  </div>
                </div>
                <pre className="max-h-48 overflow-auto bg-background/50 px-3.5 py-2.5 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">
                  {result.redacted}
                </pre>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-10 w-full rounded-xl bg-primary text-[12.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf"
          hidden
          onChange={(event) => {
            choose(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
