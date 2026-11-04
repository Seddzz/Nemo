import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  MarkBoard,
  MarkFile,
  MarkKey,
  MarkNotes,
  MarkPencil,
  MarkPlus,
  MarkSearch,
  MarkSidebar,
  MarkTrash,
} from "@/components/marks";
import { useVault } from "@/lib/store";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: MarkBoard },
  { to: "/anonymize", label: "Redact", icon: MarkFile },
  { to: "/docs", label: "Notes", icon: MarkNotes },
  { to: "/settings", label: "Key", icon: MarkKey },
] as const;

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 440;
const SIDEBAR_DEFAULT = 248;
const SIDEBAR_KEY = "nemo-sidebar";

// Per-viewer layout preference. Read after mount so the server render and the
// first client render match; storage can be unavailable, so every access is guarded.
function useSidebar() {
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SIDEBAR_KEY) || "null") as {
        open?: boolean;
        width?: number;
      } | null;
      if (saved) {
        if (typeof saved.open === "boolean") setOpen(saved.open);
        if (typeof saved.width === "number") setWidth(clampWidth(saved.width));
      }
    } catch {
      /* storage blocked: keep defaults */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ open, width }));
    } catch {
      /* ignore */
    }
  }, [open, width]);

  return { open, setOpen, width, setWidth };
}

function clampWidth(w: number) {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(w)));
}

function ago(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return "now";
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const threads = useVault((s) => s.threads);
  const activeId = useVault((s) => s.activeId);
  const newThread = useVault((s) => s.newThread);
  const selectThread = useVault((s) => s.selectThread);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { open, setOpen, width, setWidth } = useSidebar();
  const [dragging, setDragging] = useState(false);

  // Ctrl+B / Cmd+B toggles the sidebar, like most editors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    // Pointer coordinates are in screen pixels; the layout is zoomed, so convert.
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
    const startX = e.clientX;
    const startW = width;
    setDragging(true);
    const move = (ev: PointerEvent) => setWidth(clampWidth(startW + (ev.clientX - startX) / zoom));
    const up = () => {
      setDragging(false);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => !q || t.title.toLowerCase().includes(q));
  }, [threads, query]);

  return (
    <div className={`flex h-app bg-bg text-fg ${dragging ? "cursor-col-resize select-none" : ""}`}>
      <aside
        id="app-sidebar"
        aria-label="Sidebar"
        style={{ width: open ? width : 0 }}
        className={`relative hidden shrink-0 overflow-hidden bg-surface md:flex ${
          open ? "border-r border-line" : ""
        } ${dragging ? "" : "transition-[width] duration-200 ease-out motion-reduce:transition-none"}`}
      >
        <div className="flex h-full flex-col" style={{ width, minWidth: width }} inert={!open}>
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <span className="px-1 text-[13px] font-medium tracking-tight">Nemo</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse sidebar"
              aria-controls="app-sidebar"
              aria-expanded={open}
              title="Collapse sidebar (Ctrl+B)"
              className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-fg"
            >
              <MarkSidebar className="size-4" />
            </button>
          </div>
          <div className="flex flex-col gap-0.5 px-2 pt-1">
            <button
              type="button"
              onClick={() => {
                newThread();
                void navigate({ to: "/chat" });
              }}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-fg hover:bg-raised"
            >
              <MarkPlus className="size-4 text-muted" />
              New session
            </button>
            {NAV.map((item) => {
              const active = path.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] ${
                    active ? "bg-raised text-fg" : "text-muted hover:bg-raised hover:text-fg"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="px-3 pt-3">
            <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted">
              <MarkSearch className="size-3.5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sessions…"
                className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-faint"
              />
            </label>
          </div>

          <div className="mt-4 px-4 text-[11px] tracking-[0.14em] text-faint">
            SESSIONS {visible.length}
          </div>
          <div className="mt-1 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {visible.map((t) => (
              <ThreadRow
                key={t.id}
                id={t.id}
                title={t.title}
                updatedAt={t.updatedAt}
                active={path.startsWith("/chat") && t.id === activeId}
                onOpen={() => {
                  selectThread(t.id);
                  void navigate({ to: "/chat" });
                }}
              />
            ))}
            {visible.length === 0 && (
              <p className="px-2 py-1.5 text-[12px] text-faint">No sessions match “{query}”.</p>
            )}
          </div>
        </div>
        {open && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuemin={SIDEBAR_MIN}
            aria-valuemax={SIDEBAR_MAX}
            aria-valuenow={width}
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            onPointerDown={startResize}
            onDoubleClick={() => setWidth(SIDEBAR_DEFAULT)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setWidth((w) => clampWidth(w - 16));
              if (e.key === "ArrowRight") setWidth((w) => clampWidth(w + 16));
            }}
            className={`absolute inset-y-0 right-0 z-10 w-1.5 translate-x-1/2 cursor-col-resize outline-none hover:bg-line focus-visible:bg-line ${
              dragging ? "bg-line" : ""
            }`}
          />
        )}
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Expand sidebar"
            aria-controls="app-sidebar"
            aria-expanded={open}
            title="Expand sidebar (Ctrl+B)"
            className="absolute top-2.5 left-2.5 z-20 hidden rounded-md p-1.5 text-muted hover:bg-raised hover:text-fg md:block"
          >
            <MarkSidebar className="size-4" />
          </button>
        )}
        <header className="flex items-center gap-2 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => {
              newThread();
              void navigate({ to: "/chat" });
            }}
            className="shrink-0 rounded-md px-2 py-1.5 text-sm text-fg"
          >
            New
          </button>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-md px-2 py-1.5 text-sm text-muted"
            >
              {item.label}
            </Link>
          ))}
        </header>
        <main className={`min-h-0 flex-1 overflow-hidden ${open ? "" : "md:pl-11"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

function ThreadRow({
  id,
  title,
  updatedAt,
  active,
  onOpen,
}: {
  id: string;
  title: string;
  updatedAt: number;
  active: boolean;
  onOpen: () => void;
}) {
  const renameThread = useVault((s) => s.renameThread);
  const deleteThread = useVault((s) => s.deleteThread);
  const [mode, setMode] = useState<"idle" | "rename" | "confirm">("idle");
  const [name, setName] = useState(title);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "rename") input.current?.select();
  }, [mode]);

  const tone = active ? "bg-raised text-fg" : "text-muted hover:bg-raised/80 hover:text-fg";

  if (mode === "rename") {
    const commit = () => {
      renameThread(id, name);
      setMode("idle");
    };
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
        className="flex items-center rounded-md bg-raised px-2 py-1"
      >
        <input
          ref={input}
          value={name}
          maxLength={80}
          aria-label="Session name"
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setName(title);
              setMode("idle");
            }
          }}
          className="w-full bg-transparent py-0.5 text-[13px] text-fg outline-none"
        />
      </form>
    );
  }

  if (mode === "confirm") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-raised px-2 py-1.5 text-[13px]">
        <span className="min-w-0 flex-1 truncate text-fg">Delete “{title}”?</span>
        <button
          type="button"
          onClick={() => deleteThread(id)}
          className="shrink-0 rounded px-1.5 text-[12px] text-danger hover:bg-bg"
        >
          Delete
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => setMode("idle")}
          className="shrink-0 rounded px-1.5 text-[12px] text-muted hover:bg-bg hover:text-fg"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={`group flex items-center rounded-md text-[13px] ${tone}`}>
      <button
        type="button"
        onClick={onOpen}
        onDoubleClick={() => {
          setName(title);
          setMode("rename");
        }}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span
          className="shrink-0 text-[11px] text-faint group-focus-within:hidden group-hover:hidden"
          suppressHydrationWarning
        >
          {ago(updatedAt)}
        </span>
      </button>
      <div className="hidden shrink-0 items-center pe-1 group-focus-within:flex group-hover:flex">
        <button
          type="button"
          aria-label={`Rename ${title}`}
          title="Rename"
          onClick={() => {
            setName(title);
            setMode("rename");
          }}
          className="rounded p-1 text-faint hover:bg-bg hover:text-fg"
        >
          <MarkPencil className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${title}`}
          title="Delete"
          onClick={() => setMode("confirm")}
          className="rounded p-1 text-faint hover:bg-bg hover:text-danger"
        >
          <MarkTrash className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
