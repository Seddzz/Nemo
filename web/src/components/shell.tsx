import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LayoutSidebarInsetIcon,
  MarkAccount,
  MarkBoard,
  MarkIncognito,
  MarkKey,
  MarkMoney,
  MarkNotes,
  MarkPencil,
  MarkPlus,
  MarkSearch,
  MarkTrash,
} from "@/components/marks";
import { NAV_META, orderedNav, type NavKey } from "@/lib/nav";
import { useVault } from "@/lib/store";
import { ThemeSwitch, ThemeToggleButton } from "@/components/theme-switch";
import { FullAccessModal } from "@/components/full-access-modal";

const NAV_ICONS: Record<NavKey, typeof MarkBoard> = {
  dashboard: MarkBoard,
  anonymize: MarkIncognito,
  docs: MarkNotes,
  settings: MarkKey,
};

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 440;
const SIDEBAR_DEFAULT = 248;
const SIDEBAR_KEY = "relay-sidebar";

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
  const clearThreads = useVault((s) => s.clearThreads);
  const selectThread = useVault((s) => s.selectThread);
  const navOrder = useVault((s) => s.navOrder);
  const setNavOrder = useVault((s) => s.setNavOrder);
  const setFullAccessModalOpen = useVault((s) => s.setFullAccessModalOpen);
  const navigate = useNavigate();

  function moveNav(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= nav.length) return;
    const next = [...nav];
    [next[index], next[target]] = [next[target], next[index]];
    setNavOrder(next);
  }
  const [query, setQuery] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const { open, setOpen, width, setWidth } = useSidebar();
  const [dragging, setDragging] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;
  const nav = orderedNav(navOrder);

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
    <div className={`flex h-app bg-surface text-fg ${dragging ? "cursor-col-resize select-none" : ""}`}>
      <aside
        id="app-sidebar"
        aria-label="Sidebar"
        style={{ width: open ? width : 68 }}
        className={`relative hidden shrink-0 overflow-hidden border-r border-line/80 bg-surface/95 backdrop-blur md:flex ${
          open ? "" : "transition-[width] duration-200 ease-out motion-reduce:transition-none"
        } ${dragging ? "" : "transition-[width] duration-200 ease-out motion-reduce:transition-none"}`}
      >
{open ? (
        <div className="flex h-full flex-col" style={{ width: open ? width : 64, minWidth: open ? width : 64 }}>
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-controls="app-sidebar"
              aria-expanded={true}
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
              className="rounded-lg p-2 text-muted transition-colors hover:bg-raised hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
            >
              <LayoutSidebarInsetIcon className="size-4" />
            </button>
          </div>
          <div className="flex flex-col gap-0.5 px-2">
            <div className="flex items-center gap-2 px-2 py-1">
              <button
                type="button"
                onClick={() => setCustomizing((v) => !v)}
                className={`text-[11px] font-bold ${customizing ? "text-lime" : "text-muted hover:text-fg"}`}
              >
                {customizing ? "Editing…" : "Customize"}
              </button>
              {customizing && (
                <button
                  type="button"
                  onClick={() => setCustomizing(false)}
                  className="text-[11px] font-bold text-muted hover:text-fg"
                >
                  Save
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                newThread();
                void navigate({ to: "/chat" });
              }}
              className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-bold text-fg hover:bg-raised/60"
            >
              <MarkPlus className="nav-icon size-4 text-muted" />
              New session
            </button>
            <label className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-muted transition-colors hover:bg-raised/60 focus-within:text-fg">
              <MarkSearch className="size-4 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-[13px] font-bold text-fg outline-none placeholder:text-muted"
              />
            </label>
            {nav.map((key, index) => {
              const item = NAV_META[key];
              const Icon = NAV_ICONS[key];
              const active = path.startsWith(item.to);
              return (
                <div
                  key={key}
                  draggable={customizing}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => {
                    if (!customizing) return;
                    e.preventDefault();
                    if (dragIndex === null || dragIndex === index) return;
                    const next = [...nav];
                    const [moved] = next.splice(dragIndex, 1);
                    next.splice(index, 0, moved);
                    setNavOrder(next);
                    setDragIndex(index);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`flex items-center gap-1 ${customizing ? "cursor-grab active:cursor-grabbing" : ""} ${dragIndex === index ? "opacity-50" : ""}`}
                >
                  <Link
                    to={item.to}
                    className={`group flex flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-bold outline-none transition-colors ${
                      active
                        ? "text-fg"
                        : "text-muted hover:bg-raised/60 hover:text-fg"
                    }`}
                  >
                    <Icon className={`nav-icon size-4 ${active ? "text-lime" : ""}`} />
                    <span>{item.label}</span>
                  </Link>
                  {customizing && (
                    <>
                      <button
                        type="button"
                        onClick={() => moveNav(index, -1)}
                        disabled={index === 0}
                        className="rounded px-1.5 py-1 text-[11px] text-muted hover:text-fg disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveNav(index, 1)}
                        disabled={index === nav.length - 1}
                        className="rounded px-1.5 py-1 text-[11px] text-muted hover:text-fg disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between px-4 text-[10px] font-bold tracking-[0.14em] text-faint uppercase">
            <span>Recents {visible.length}</span>
            {clearConfirm ? (
              <span className="flex items-center gap-2 tracking-normal normal-case">
                <button
                  type="button"
                  onClick={() => {
                    clearThreads();
                    setClearConfirm(false);
                  }}
                  className="text-danger hover:text-danger/80"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setClearConfirm(false)}
                  className="text-muted hover:text-fg"
                >
                  Cancel
                </button>
              </span>
            ) : (
              threads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setClearConfirm(true)}
                  aria-label="Remove all conversations"
                  title="Remove all conversations"
                  className="text-faint transition-colors hover:text-danger"
                >
                  <MarkTrash className="size-3.5" />
                </button>
              )
            )}
          </div>
          <div className="nice-scroll mt-1 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
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
              <p className="px-2 py-1.5 text-[12px] text-faint">
                {query.trim() ? "No sessions match." : "No conversations yet."}
              </p>
            )}
          </div>

          <div className="mt-auto px-3 pb-3">
            <div className="mb-1 flex items-center justify-between py-1 pl-2 pr-0.5">
              <span className="text-[11px] font-bold text-muted">Theme</span>
              <ThemeSwitch />
            </div>
            <button
              type="button"
              onClick={() => setFullAccessModalOpen(true)}
              title="Upgrade via Stripe"
              className="mb-2 group flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-[13px] font-bold text-muted transition-colors hover:bg-raised/60 hover:text-fg"
            >
              <MarkMoney className="nav-icon size-4" />
              <span className="flex-1 text-left">Get full access</span>
            </button>
            <Link
              to="/settings"
              className="group flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px] font-bold text-muted transition-colors hover:bg-raised/60 hover:text-fg"
            >
              <MarkAccount className="nav-icon size-4" />
              <span className="flex-1">Account</span>
              <span className="text-[11px] font-semibold text-faint">Free</span>
            </Link>
          </div>
        </div>
        ) : (
          <div className="flex h-full w-[68px] flex-col py-3">
            <div className="flex items-center px-3 pb-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-controls="app-sidebar"
                aria-expanded={false}
                aria-label="Toggle sidebar"
                title="Toggle sidebar"
                className="rounded-lg p-2 text-muted transition-colors hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                <LayoutSidebarInsetIcon className="size-4" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  newThread();
                  void navigate({ to: "/chat" });
                }}
                aria-controls="app-sidebar"
                aria-label="New session"
                title="New session"
                className="rounded-md p-2 text-muted transition-colors hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                <MarkPlus className="nav-icon size-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-controls="app-sidebar"
                aria-expanded={false}
                aria-label="Search"
                title="Search"
                className="mb-2 rounded-md p-2 text-muted transition-colors hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                <MarkSearch className="nav-icon size-4" />
              </button>
              {nav.map((key) => {
                const Icon = NAV_ICONS[key];
                const item = NAV_META[key];
                const active = path.startsWith(item.to);
                return (
                  <Link
                    key={key}
                    to={item.to}
                    title={item.label}
                    className={`rounded-md p-2 transition-colors ${
                      active ? "text-lime" : "text-muted hover:text-lime"
                    }`}
                  >
                    <Icon className={`nav-icon size-4 ${active ? "text-lime" : ""}`} />
                  </Link>
                );
              })}
            </div>
            <div className="mt-auto flex flex-col items-center gap-2">
              <ThemeToggleButton />
              <button
                type="button"
                onClick={() => setFullAccessModalOpen(true)}
                title="Get full access"
                className="rounded-md p-2 text-muted hover:text-lime"
              >
                <MarkMoney className="nav-icon size-4" />
              </button>
              <Link to="/settings" title="Account" className="rounded-md p-2 text-muted hover:text-lime">
                <MarkAccount className="nav-icon size-4" />
              </Link>
            </div>
          </div>
        )}
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
        <header className="flex items-center gap-2 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => {
              newThread();
              void navigate({ to: "/chat" });
            }}
            className="shrink-0 rounded-md px-2 py-1.5 text-sm font-bold text-fg"
          >
            New
          </button>
          {nav.map((key) => (
            <Link
              key={key}
              to={NAV_META[key].to}
              className="shrink-0 rounded-md px-2 py-1.5 text-sm font-bold text-muted"
            >
              {NAV_META[key].label}
            </Link>
          ))}
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">
          <motion.div
            key={path}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
      <FullAccessModal />
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

  const tone = active
    ? "bg-raised text-fg"
    : "text-muted hover:bg-raised/80 hover:text-fg";

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
    <div
      className={`group flex items-center rounded-md text-[13px] font-bold transition-colors ${tone}`}
    >
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
          <MarkPencil className="nav-icon size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${title}`}
          title="Delete"
          onClick={() => setMode("confirm")}
          className="rounded p-1 text-faint hover:bg-bg hover:text-danger"
        >
          <MarkTrash className="nav-icon size-3.5" />
        </button>
      </div>
    </div>
  );
}
