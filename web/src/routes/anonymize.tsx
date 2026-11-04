import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { MarkUpload } from "@/components/marks";
import { SAMPLE, anonymize } from "@/lib/anonymize";
import { useVault } from "@/lib/store";

export const Route = createFileRoute("/anonymize")({ component: Redact });

// Files are read as text in the browser; nothing is uploaded anywhere.
const TEXT_EXTENSIONS = [
  "txt",
  "md",
  "csv",
  "tsv",
  "json",
  "log",
  "xml",
  "html",
  "htm",
  "yaml",
  "yml",
  "eml",
  "rtf",
];
const BINARY_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "png",
  "jpg",
  "jpeg",
];
const ACCEPT = TEXT_EXTENSIONS.map((e) => "." + e).join(",") + ",text/*,application/json";
const MAX_BYTES = 2 * 1024 * 1024;

function readable(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (BINARY_EXTENSIONS.includes(ext)) {
    return `.${ext} files aren't supported yet. Save it as .txt or paste the text instead.`;
  }
  if (
    !TEXT_EXTENSIONS.includes(ext) &&
    !file.type.startsWith("text/") &&
    file.type !== "application/json"
  ) {
    return "That doesn't look like a text file. Try .txt, .md, .csv or .json.";
  }
  if (file.size > MAX_BYTES) return `That file is ${size(file.size)}. The limit is 2 MB.`;
  return null;
}

function size(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Redact() {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileError, setFileError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const ledger = useVault((s) => s.ledger);
  const remember = useVault((s) => s.remember);
  const record = useVault((s) => s.record);
  const [logged, setLogged] = useState(false);

  const strict = useVault((s) => s.strict);
  const result = useMemo(() => anonymize(source, ledger, strict), [source, ledger, strict]);
  const localHits = result.hits.filter((h) => source.includes(h.value));

  function onFile(file: File) {
    const problem = readable(file);
    if (problem) {
      setFileError(problem);
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      setSource(String(reader.result || ""));
      setFileName(file.name);
      setFileSize(file.size);
      setLogged(false);
    };
    reader.onerror = () => setFileError("Couldn't read that file.");
    reader.readAsText(file);
  }

  function clearSource() {
    setSource("");
    setFileName("");
    setFileSize(0);
    setFileError("");
    setLogged(false);
  }

  function commit() {
    if (!source.trim()) return;
    const fresh = localHits.filter((h) => !ledger.some((p) => p.token === h.token));
    remember(result.hits);
    record(
      {
        kind: "document",
        title: fileName || source.replace(/\s+/g, " ").slice(0, 48) || "Pasted text",
        entities: localHits.length,
      },
      fresh.length,
      true,
    );
    setLogged(true);
  }

  function download() {
    const blob = new Blob([result.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (fileName || "redacted").replace(/\.\w+$/, "") + ".redacted.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-6 py-4 md:px-10">
        <div>
          <div className="text-[11px] text-faint">Redact</div>
          <h1 className="text-sm text-fg">Source and the copy that would leave</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-raised"
          >
            <MarkUpload className="size-4" />
            Upload file
          </button>
          <button
            type="button"
            onClick={() => {
              setFileError("");
              setFileSize(0);
              setSource(SAMPLE);
              setFileName("intake-note.txt");
              setLogged(false);
            }}
            className="rounded-full border border-line px-4 py-2 text-sm hover:bg-raised"
          >
            Load a sample
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={!source.trim()}
            className="rounded-full bg-fg px-4 py-2 text-sm text-ink disabled:opacity-40"
          >
            {logged ? "Recorded" : "Count this pass"}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-max overflow-y-auto lg:auto-rows-auto lg:grid-cols-[1fr_1fr_16rem] lg:overflow-hidden">
        <section
          className="relative flex flex-col lg:min-h-0 border-b border-line lg:border-r lg:border-b-0"
          onDragEnter={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
        >
          <input
            ref={picker}
            type="file"
            accept={ACCEPT}
            className="hidden"
            aria-label="Upload a text file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex items-center justify-between gap-3 px-6 py-3 text-xs tracking-wide text-faint uppercase">
            <span>Source</span>
            {source && (
              <button
                type="button"
                onClick={clearSource}
                className="text-muted normal-case hover:text-fg"
              >
                Clear
              </button>
            )}
          </div>
          {fileName && source && (
            <div className="mx-6 mb-3 flex items-center gap-2 self-start rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px]">
              <MarkUpload className="size-3.5 text-muted" />
              <span className="max-w-[16rem] truncate text-fg">{fileName}</span>
              {fileSize > 0 && <span className="text-faint">{size(fileSize)}</span>}
            </div>
          )}
          {fileError && (
            <p
              role="alert"
              className="mx-6 mb-3 rounded-md border border-danger/40 px-3 py-2 text-[12px] text-danger"
            >
              {fileError}
            </p>
          )}
          {source ? (
            <textarea
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setLogged(false);
                if (!e.target.value) clearSource();
              }}
              aria-label="Source text"
              className="min-h-64 flex-1 resize-none bg-transparent px-6 pb-6 text-sm leading-relaxed outline-none"
            />
          ) : (
            <div className="flex min-h-64 flex-1 flex-col px-6 pb-6">
              <button
                type="button"
                onClick={() => picker.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-6 py-8 text-center hover:border-muted hover:bg-raised/40"
              >
                <MarkUpload className="size-5 text-muted" />
                <span className="text-sm text-fg">Drop a file here or browse</span>
                <span className="text-[12px] text-faint">
                  .txt .md .csv .json .log .html · up to 2 MB · read on this device
                </span>
              </button>
              <div className="my-4 flex items-center gap-3 text-[11px] tracking-wide text-faint uppercase">
                <span className="h-px flex-1 bg-line" /> or paste{" "}
                <span className="h-px flex-1 bg-line" />
              </div>
              <textarea
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setLogged(false);
                  setFileError("");
                }}
                aria-label="Source text"
                placeholder="Paste a note, an email, a transcript…"
                className="min-h-32 flex-1 resize-none rounded-xl border border-line bg-transparent px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-faint focus:border-muted"
              />
            </div>
          )}
          {dragOver && (
            <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-lime bg-bg/85 text-sm text-fg">
              Drop to load the file
            </div>
          )}
        </section>

        <section className="flex flex-col lg:min-h-0 border-b border-line lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between px-6 py-3 text-xs tracking-wide text-faint uppercase">
            <span>Leaves the machine</span>
            <button
              type="button"
              onClick={download}
              disabled={!source.trim()}
              className="text-muted hover:text-fg disabled:opacity-40"
            >
              Download
            </button>
          </div>
          <pre className="min-h-64 flex-1 overflow-auto px-6 pb-6 font-sans text-sm leading-relaxed whitespace-pre-wrap text-fg">
            {source ? result.text : "The redacted copy appears here."}
          </pre>
        </section>

        <aside className="lg:min-h-0 lg:overflow-y-auto bg-surface px-5 py-4">
          <div className="text-xs tracking-wide text-faint uppercase">Held locally</div>
          <div className="mt-2 text-3xl text-fg">{localHits.length}</div>
          <p className="mt-1 text-xs text-muted">spans in this draft</p>
          <ul className="mt-6 space-y-3">
            {dedupe(localHits).map((h) => (
              <li key={h.token} className="border-t border-line pt-3">
                <div className="text-[11px] text-muted">{h.kind}</div>
                <div className="mt-1 text-sm">{h.value}</div>
                <div className="mt-0.5 font-mono text-xs text-faint">{h.token}</div>
              </li>
            ))}
            {localHits.length === 0 && (
              <li className="text-sm text-muted">No entities detected yet.</li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function dedupe<T extends { token: string }>(hits: T[]) {
  const seen = new Set<string>();
  return hits.filter((h) => (seen.has(h.token) ? false : (seen.add(h.token), true)));
}
