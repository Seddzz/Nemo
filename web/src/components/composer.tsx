import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MarkFileText, MarkPlus, MarkUpload, MarkX } from "@/components/marks";
import { queueDraft } from "@/lib/draft";
import { ACCEPT, formatSize, readable, readTextFile } from "@/lib/files";
import { providerInfo } from "@/lib/models";
import { relayModels } from "@/lib/relay";
import { eventMatchesShortcut, prettyShortcut } from "@/lib/shortcuts";
import { useVault, type Attachment } from "@/lib/store";

export type ComposerPayload = {
  text: string;
  attachments: Attachment[];
  anonymize: boolean;
};

export function Composer({
  onSend,
  busy,
}: {
  onSend?: (payload: ComposerPayload) => void;
  busy?: boolean;
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [anonymize, setAnonymize] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const modelListRef = useRef<HTMLDivElement>(null);
  const model = useVault((s) => s.model);
  const provider = useVault((s) => s.provider);
  const apiKey = useVault((s) => s.apiKey);
  const baseUrl = useVault((s) => s.baseUrl);
  const hasKey = apiKey.trim().length > 8;
  const strict = useVault((s) => s.strict);
  const setStrict = useVault((s) => s.setStrict);
  const setModel = useVault((s) => s.setModel);
  const shortcut = useVault((s) => s.anonymizeShortcut);
  const navigate = useNavigate();
  const [modelOpen, setModelOpen] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelState, setModelState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [modelError, setModelError] = useState("");

  useEffect(() => {
    if (!modelOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (modelListRef.current && !modelListRef.current.contains(event.target as Node)) {
        setModelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [modelOpen]);

  useEffect(() => {
    if (!modelOpen || !hasKey) return;
    let active = true;
    setModelState("loading");
    setModelError("");
    void relayModels({
      data: { provider, apiKey: apiKey.trim(), baseUrl },
    }).then((result) => {
      if (!active) return;
      if (result.ok) {
        setModels(result.models);
        setModelState("ready");
      } else {
        setModels([]);
        setModelError(result.error);
        setModelState("error");
      }
    });
    return () => {
      active = false;
    };
  }, [modelOpen, provider, apiKey, baseUrl, hasKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !eventMatchesShortcut(e, shortcut)) return;
      e.preventDefault();
      setAnonymize((on) => !on);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    const next: Attachment[] = [];
    let error = "";
    for (const file of list) {
      const problem = readable(file);
      if (problem) {
        error = problem;
        continue;
      }
      try {
        const text = await readTextFile(file);
        next.push({
          id: Math.random().toString(36).slice(2, 10),
          name: file.name,
          size: file.size,
          text,
        });
      } catch (err) {
        error = err instanceof Error ? err.message : "Couldn't read that file.";
      }
    }
    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next].slice(0, 6));
      setUploadOpen(false);
    }
    setFileError(error);
  }

  function submit() {
    const text = value.trim();
    if ((!text && attachments.length === 0) || busy) return;
    const payload: ComposerPayload = { text, attachments, anonymize };
    setValue("");
    setAttachments([]);
    setFileError("");
    if (onSend) onSend(payload);
    else {
      queueDraft(payload);
      void navigate({ to: "/chat" });
    }
  }

  const label = hasKey ? model : "No key";
  const who = providerInfo(provider).label;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="w-full"
    >
       <div
         className="rounded-2xl border border-line bg-raised"
       >
         <div className="px-3 pt-3 pb-2">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((file) => (
                <span
                  key={file.id}
                  className="flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[11px]"
                >
                  <MarkFileText className="size-3.5 shrink-0 text-muted" />
                  <span className="max-w-44 truncate text-fg">{file.name}</span>
                  <span className="shrink-0 text-faint">{formatSize(file.size)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setAttachments((prev) => prev.filter((f) => f.id !== file.id))
                    }
                    className="rounded p-0.5 text-faint hover:bg-raised hover:text-fg"
                  >
                    <MarkX className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {fileError && (
            <p role="alert" className="mb-2 text-[11px] text-danger">
              {fileError}
            </p>
          )}
          <textarea
            value={value}
            rows={2}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask anything"
            className="max-h-40 min-h-12 w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed outline-none placeholder:text-faint"
          />
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setFileError("");
                    setUploadOpen((open) => !open);
                  }}
                  aria-expanded={uploadOpen}
                  aria-haspopup="dialog"
                  aria-label="Add files"
                  title="Add files"
                  className={`flex size-8 items-center justify-center rounded-full transition-transform duration-200 hover:bg-bg hover:text-fg active:scale-90 ${
                    uploadOpen ? "rotate-45 bg-bg text-fg" : "text-muted"
                  }`}
                >
                  <MarkPlus className="size-4" />
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPT}
                  multiple
                  className="hidden"
                  aria-label="Upload text files"
                  onChange={(e) => {
                    if (e.target.files) void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <AnimatePresence>
                  {uploadOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute bottom-full left-0 z-40 mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-2 shadow-2xl"
                    >
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        onDragEnter={(e) => {
                          if (!e.dataTransfer.types.includes("Files")) return;
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragOver={(e) => {
                          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            setDragOver(false);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          if (e.dataTransfer.files) void addFiles(e.dataTransfer.files);
                        }}
                        className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
                          dragOver
                            ? "border-lime bg-lime/10"
                            : "border-line hover:border-muted hover:bg-raised"
                        }`}
                      >
                        <MarkUpload className="size-5 text-muted" />
                        <span className="text-[13px] font-semibold text-fg">
                          Drop files or browse
                        </span>
                        <span className="text-[11px] text-faint">
                          .txt .md .csv .json .log · up to 2 MB
                        </span>
                      </button>
                      <p className="px-2 pt-2 text-[11px] leading-relaxed text-faint">
                        Files are read on this device and sent as text with your prompt.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={anonymize}
                onClick={() => {}}
                aria-disabled="true"
                title={`Anonymization is currently disabled (${prettyShortcut(shortcut)})`}
                className="rounded-full px-2 py-1 text-[12px] font-bold text-muted"
              >
                Anonymize
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={modelListRef}>
                <button
                  type="button"
                  onClick={() => setModelOpen((open) => !open)}
                  aria-expanded={modelOpen}
                  aria-haspopup="listbox"
                  className="rounded-full px-2 py-1 text-[12px] text-muted transition-colors hover:bg-bg hover:text-fg"
                >
                  {who} · {label}
                </button>
                <AnimatePresence>
                  {modelOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 bottom-full z-30 mb-2 w-72 rounded-xl border border-line bg-surface p-2 shadow-2xl"
                    >
                      <button
                        type="button"
                        onClick={() => void navigate({ to: "/settings" })}
                        className="w-full rounded-lg border-b border-line px-3 py-2 text-left text-xs text-muted hover:bg-raised hover:text-fg"
                      >
                        Configure {who} API key
                      </button>
                      <div className="px-3 pt-2 pb-1 text-[10px] tracking-wide text-faint uppercase">
                        Available models
                      </div>
                      {!hasKey ? (
                        <p className="px-3 py-2 text-xs text-muted">
                          Add an API key to load models.
                        </p>
                      ) : modelState === "loading" ? (
                        <p className="px-3 py-2 text-xs text-muted">Loading models…</p>
                      ) : modelState === "error" ? (
                        <p className="px-3 py-2 text-xs text-danger">{modelError}</p>
                      ) : (
                        <div
                          className="nice-scroll max-h-36 overflow-y-auto pr-1"
                          role="listbox"
                          aria-label="Available models"
                        >
                          {models.map((id) => (
                            <button
                              key={id}
                              type="button"
                              role="option"
                              aria-selected={id === model}
                              onClick={() => {
                                setModel(id);
                                setModelOpen(false);
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                                id === model
                                  ? "bg-raised text-fg"
                                  : "text-muted hover:bg-raised hover:text-fg"
                              }`}
                            >
                              {id}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={strict}
                aria-label="Strict"
                onClick={() => setStrict(!strict)}
                className="flex items-center gap-2"
              >
                <span className="text-[13px] font-semibold text-muted transition-colors hover:text-fg">
                  Strict
                </span>
                <span
                  className={`relative h-3.5 w-6 rounded-full transition-colors duration-200 ${
                    strict ? "bg-fg" : "bg-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-2.5 rounded-full shadow-sm transition-transform duration-200 ${
                      strict ? "translate-x-2.5 bg-ink" : "translate-x-0 bg-fg"
                    }`}
                  />
                </span>
              </button>
              <button
                type="submit"
                disabled={busy || (!value.trim() && attachments.length === 0)}
                aria-label="Send"
                className="flex size-8 items-center justify-center rounded-full bg-fg text-ink disabled:opacity-40"
              >
                <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                  <path
                    d="M8 12.5V3.5M4.5 6.5 8 3.5l3.5 3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />
                </svg>
              </button>
            </div>
          </div>
         </div>
        </div>
      </form>
  );
}
