"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  Lock,
  MessageSquare,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";

import { useApp } from "@/components/app/app-context";
import AiStatus from "@/components/ui/ai-status";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import FluidOrb from "@/components/ui/fluid-orb";
import {
  anonymizeFile,
  downloadText,
  redactedFileName,
  type AnonymizeResult,
} from "@/lib/anonymize";
import { cn } from "@/lib/utils";

type Phase = "idle" | "ready" | "working" | "result" | "error";

const MAX_BYTES = 10 * 1024 * 1024;

export function UploadView() {
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

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setPhase("idle");
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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-7 px-5 pt-10 pb-16 sm:pt-16">
        <header className="flex flex-col items-center text-center">
          <div className="orb-halo mb-6">
            <FluidOrb size={128} color="#c8ff00" />
          </div>
          <p className="text-[10.5px] font-semibold tracking-[0.18em] text-primary uppercase">
            Local-first PII redaction
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Anonymize a document
          </h1>
          <p className="mt-2.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
            Drop a PDF or text file. Nemo finds the PII and returns a redacted copy — one-way,
            nothing stored.
          </p>
        </header>

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
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/40 px-6 py-14 text-center outline-none transition-colors",
              dragging
                ? "border-primary bg-primary/[0.04]"
                : "border-border hover:border-primary/50 hover:bg-card/70 focus-visible:border-primary/60",
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-primary">
              <Upload className="size-[18px]" />
            </span>
            <span className="text-[13.5px] font-medium text-foreground">
              Drop a document here
            </span>
            <span className="text-[11.5px] text-muted-foreground">
              or click to browse · PDF, TXT · 10 MB max
            </span>
          </div>
        ) : null}

        {phase === "ready" && file ? (
          <div className="animate-pop flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
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
                onClick={reset}
                aria-label="Remove file"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
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
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-primary text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Anonymize
              <span className="size-1.5 rounded-full bg-primary-foreground" />
            </button>
            <p className="text-center text-[11px] text-muted-foreground/70">
              Runs against your local engine — nothing leaves this device.
            </p>
          </div>
        ) : null}

        {phase === "working" ? (
          <div className="animate-pop flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/60 px-6 py-14">
            <AiStatus state="analyzing" label="Redacting" detail={file?.name} timer shimmer />
            <p className="text-[11.5px] text-muted-foreground">
              Scanning for names, emails, phones and more…
            </p>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="animate-pop flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
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
          <div className="animate-pop flex flex-col gap-3">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12.5px] font-medium text-foreground">
                    {file?.name ?? "document"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <AnimatedCounter value={result.entities.length} />
                    </span>
                    entities redacted
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadText(redactedFileName(file?.name ?? "document.txt"), result.redacted)
                    }
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Download className="size-3" />
                    Download
                  </button>
                </div>
              </div>
              <pre className="max-h-64 overflow-auto bg-background/50 px-4 py-3.5 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">
                {result.redacted}
              </pre>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                New document
              </button>
              <Link
                href="/chat"
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-[12.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <MessageSquare className="size-3.5" />
                Chat with Nemo
              </Link>
            </div>
          </div>
        ) : null}

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
          <Lock className="size-3" />
          Redactions are one-way and stay on this device.
        </p>

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
