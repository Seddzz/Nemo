import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Keyboard, PanelLeft, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useShallow } from "zustand/react/shallow";
import { MarkMoney, MarkSearch } from "@/components/marks";
import { PROVIDERS, providerInfo, type Provider } from "@/lib/models";
import { NAV_META, NAV_ORDER_DEFAULT, orderedNav, type NavKey } from "@/lib/nav";
import { prettyShortcut, shortcutFromEvent } from "@/lib/shortcuts";
import { useVault, type AnonymizeScope, type KeySettings } from "@/lib/store";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const CUSTOM = "__custom__";

const SCOPES: { id: AnonymizeScope; label: string; note: string }[] = [
  { id: "both", label: "Prompt and files", note: "Anonymize the message and any attached text." },
  { id: "file", label: "Files only", note: "Leave the prompt as written, mask attached text." },
  { id: "text", label: "Prompt only", note: "Mask the prompt, leave attached text as written." },
];

type SectionID = "api-key" | "shortcuts" | "preferences" | "sidebar" | "full-access";

const SECTIONS: { id: SectionID; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "api-key", label: "API key", icon: KeyRound },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "sidebar", label: "Sidebar", icon: PanelLeft },
  { id: "full-access", label: "Full access", icon: MarkMoney },
];

const SECTION_IDS = SECTIONS.map((section) => section.id);

function SettingsPage() {
  const saved = useVault(
    useShallow((s) => ({
      provider: s.provider,
      apiKey: s.apiKey,
      model: s.model,
      baseUrl: s.baseUrl,
      restoreReplies: s.restoreReplies,
      anonymizeScope: s.anonymizeScope,
      anonymizeShortcut: s.anonymizeShortcut,
    })),
  );
  const saveKey = useVault((s) => s.saveKey);
  const navOrder = useVault((s) => s.navOrder);
  const setNavOrder = useVault((s) => s.setNavOrder);
  const setFullAccessModalOpen = useVault((s) => s.setFullAccessModalOpen);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { active, select } = useSectionSpy(scrollRef);

  // Edits stay local until Save; the persisted settings only change on submit.
  const [draft, setDraft] = useState<KeySettings>(saved);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [customModel, setCustomModel] = useState(
    () => !providerInfo(saved.provider).models.includes(saved.model),
  );
  const [recording, setRecording] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Provider>(saved.provider);

  // The store rehydrates from localStorage after the first render; pick that up once.
  const hydrated = useVault.persist?.hasHydrated?.() ?? true;
  useEffect(() => {
    const current = useVault.getState();
    const next = {
      provider: current.provider,
      apiKey: current.apiKey,
      model: current.model,
      baseUrl: current.baseUrl,
      restoreReplies: current.restoreReplies,
      anonymizeScope: current.anonymizeScope,
      anonymizeShortcut: current.anonymizeShortcut,
    };
    setDraft(next);
    setCustomModel(!providerInfo(next.provider).models.includes(next.model));
    setExpanded(next.provider);
  }, [hydrated]);

  useEffect(() => {
    if (status !== "saved") return;
    const t = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(t);
  }, [status]);

  const info = providerInfo(draft.provider);
  const dirty = (Object.keys(draft) as (keyof KeySettings)[]).some((k) => draft[k] !== saved[k]);
  const update = (patch: Partial<KeySettings>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setStatus("idle");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROVIDERS;
    return PROVIDERS.filter((p) =>
      `${p.label} ${p.family} ${p.note} ${p.id}`.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!recording) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setRecording(false);
        return;
      }
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey || /^F\d{1,2}$/.test(event.key);
      if (!hasModifier) return;
      const value = shortcutFromEvent(event);
      if (!value) return;
      setDraft((d) => ({ ...d, anonymizeShortcut: value }));
      setStatus("idle");
      setRecording(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording]);

  function pickProvider(id: Provider) {
    const next = providerInfo(id);
    update({ provider: id, model: next.models[0] ?? "", baseUrl: next.baseUrl });
    setCustomModel(next.models.length === 0);
  }

  function chooseProvider(id: Provider) {
    setExpanded(id);
    if (draft.provider !== id) pickProvider(id);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.model.trim()) return;
    saveKey({ ...draft, model: draft.model.trim() });
    setStatus("saved");
  }

  function moveNav(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= navOrder.length) return;
    const next = [...navOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setNavOrder(next);
  }

  return (
    <form onSubmit={save} className="flex h-full min-h-0">
      <aside className="hidden w-56 shrink-0 border-r border-line/70 lg:block">
        <div className="nice-scroll h-full overflow-y-auto">
          <SectionSidebar active={active} onSelect={select} />
        </div>
      </aside>

      <div ref={scrollRef} className="nice-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10 md:px-10 md:py-14">
          <MobileSectionNav active={active} onSelect={select} />

          <header id="api-key" className="scroll-mt-6">
            <p className="text-[11px] font-medium tracking-wide text-lime uppercase">Settings</p>
            <h1 className="mt-2 text-3xl tracking-tight text-fg md:text-4xl">
              Bring the model you already use
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
              The credential stays in this browser. It is sent only when you press Send, and only
              with the anonymized transcript.
            </p>

            <fieldset className="mt-8">
              <legend className="sr-only">Provider and credentials</legend>
              <div className="overflow-hidden rounded-xl border border-line bg-surface/40">
                <label className="flex items-center gap-2.5 border-b border-line/70 px-4 py-3 text-muted transition-colors focus-within:text-fg">
                  <MarkSearch className="size-4 shrink-0" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                    }}
                    placeholder="Search providers"
                    aria-label="Search providers"
                    className="w-full bg-transparent text-sm font-bold text-fg outline-none placeholder:text-muted"
                  />
                </label>

                <div className="divide-y divide-line/60">
                  {filtered.map((p) => {
                    const on = draft.provider === p.id;
                    const open = expanded === p.id;
                    return (
                      <div key={p.id}>
                        <div className="flex items-center gap-2 pr-3">
                          <button
                            type="button"
                            onClick={() => chooseProvider(p.id)}
                            aria-expanded={open}
                            className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left outline-none focus-visible:bg-raised/40"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-bold text-fg">{p.label}</span>
                                {saved.provider === p.id && (
                                  <span className="text-[10px] tracking-wide text-faint uppercase">
                                    In use
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {p.family} · {p.note}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => chooseProvider(p.id)}
                            aria-pressed={on}
                            aria-label={on ? `${p.label} is active` : `Use ${p.label}`}
                            className="shrink-0 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                          >
                            <Switch on={on} />
                          </button>
                        </div>

                        {open && (
                          <div className="space-y-4 border-t border-line/50 bg-surface/50 px-4 py-4">
                            <div>
                              <label
                                htmlFor={`key-${p.id}`}
                                className="text-xs tracking-wide text-faint uppercase"
                              >
                                API key
                              </label>
                              <input
                                id={`key-${p.id}`}
                                type="password"
                                value={draft.apiKey}
                                autoComplete="off"
                                onChange={(e) => update({ apiKey: e.target.value })}
                                placeholder={info.keyHint}
                                className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-fg"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`model-${p.id}`}
                                className="text-xs tracking-wide text-faint uppercase"
                              >
                                Model
                              </label>
                              {info.models.length > 0 && (
                                <select
                                  id={`model-${p.id}`}
                                  value={customModel ? CUSTOM : draft.model}
                                  onChange={(e) => {
                                    if (e.target.value === CUSTOM) {
                                      setCustomModel(true);
                                      update({ model: "" });
                                    } else {
                                      setCustomModel(false);
                                      update({ model: e.target.value });
                                    }
                                  }}
                                  className="mt-2 w-full appearance-none rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-fg"
                                >
                                  {info.models.map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                  <option value={CUSTOM}>Custom model…</option>
                                </select>
                              )}
                              {(customModel || info.models.length === 0) && (
                                <input
                                  value={draft.model}
                                  onChange={(e) => update({ model: e.target.value })}
                                  placeholder="Exact model id, e.g. my-model-v2"
                                  aria-label="Custom model id"
                                  className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-fg"
                                />
                              )}
                            </div>

                            {draft.provider === "compatible" && (
                              <div>
                                <label
                                  htmlFor={`base-${p.id}`}
                                  className="text-xs tracking-wide text-faint uppercase"
                                >
                                  Base URL
                                </label>
                                <input
                                  id={`base-${p.id}`}
                                  value={draft.baseUrl}
                                  onChange={(e) => update({ baseUrl: e.target.value })}
                                  className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-fg"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filtered.length === 0 && (
                    <p className="px-4 py-6 text-sm text-muted">No providers match.</p>
                  )}
                </div>
              </div>
            </fieldset>
          </header>

          <section id="shortcuts" className="scroll-mt-6 pt-12">
            <h2 className="text-xl tracking-tight text-fg">Shortcuts</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Choose the chord that toggles anonymization for the next message.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <div className="flex flex-wrap items-center gap-3 px-4 py-4">
                <span className="flex-1 text-sm font-bold text-fg">Toggle anonymization</span>
                <button
                  type="button"
                  onClick={() => setRecording((on) => !on)}
                  className={`min-w-40 rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
                    recording
                      ? "border-lime bg-lime text-ink"
                      : "border-line bg-surface hover:bg-raised"
                  }`}
                >
                  {recording ? "Press keys…" : prettyShortcut(draft.anonymizeShortcut)}
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => update({ anonymizeShortcut: "Ctrl+H" })}
                className="text-xs text-muted hover:text-fg"
              >
                Reset to Ctrl + H
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Hold Ctrl, Alt or Meta while pressing a key. Press the shortcut in the prompt bar to
              switch anonymization for the next message.
            </p>
          </section>

          <section id="preferences" className="scroll-mt-6 pt-12">
            <h2 className="text-xl tracking-tight text-fg">Preferences</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Choose what leaves this device and how the reply is shown back to you.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <div className="flex items-start gap-3 border-b border-line/60 px-4 py-4">
                <span className="flex-1">
                  <span className="block text-sm font-bold text-fg">Restore tokens in replies</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    After the model answers, known tokens are replaced with your originals locally.
                    The model still never saw them.
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.restoreReplies}
                  aria-label="Restore tokens in replies"
                  onClick={() => update({ restoreReplies: !draft.restoreReplies })}
                  className="mt-0.5 shrink-0 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                  <Switch on={draft.restoreReplies} />
                </button>
              </div>

              <div className="px-4 py-4">
                <p className="text-xs tracking-wide text-faint uppercase">Anonymize</p>
                <div className="mt-2 space-y-1">
                  {SCOPES.map((scope) => {
                    const on = draft.anonymizeScope === scope.id;
                    return (
                      <button
                        key={scope.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => update({ anonymizeScope: scope.id })}
                        className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          on ? "bg-raised" : "hover:bg-raised/60"
                        }`}
                      >
                        <span className="flex-1">
                          <span className="block text-sm font-bold text-fg">{scope.label}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                            {scope.note}
                          </span>
                        </span>
                        <span
                          className={`mt-1 size-3.5 shrink-0 rounded-full border transition-colors ${
                            on ? "border-lime bg-lime" : "border-line"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section id="sidebar" className="scroll-mt-6 pt-12">
            <h2 className="text-xl tracking-tight text-fg">Sidebar</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Choose the order of the sidebar. How it works sits last by default and Account is
              always pinned to the bottom.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              {orderedNav(navOrder).map((key: NavKey, index) => (
                <div
                  key={key}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    index > 0 ? "border-t border-line/60" : ""
                  }`}
                >
                  <span className="flex-1 text-sm font-bold text-fg">{NAV_META[key].label}</span>
                  <button
                    type="button"
                    onClick={() => moveNav(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${NAV_META[key].label} up`}
                    className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-fg disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveNav(index, 1)}
                    disabled={index === navOrder.length - 1}
                    aria-label={`Move ${NAV_META[key].label} down`}
                    className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-fg disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setNavOrder([...NAV_ORDER_DEFAULT])}
              className="mt-3 text-xs text-muted hover:text-fg"
            >
              Reset sidebar order
            </button>
          </section>

          <section id="full-access" className="scroll-mt-6 pt-12">
            <h2 className="text-xl tracking-tight text-fg">Full access</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              The free workspace covers local anonymization, file passes and chats with your own
              key. Full access is the paid workspace for heavier use.
            </p>
            <button
              type="button"
              onClick={() => setFullAccessModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-surface/60 px-4 py-2.5 text-sm font-bold text-fg transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
            >
              <MarkMoney className="size-4 text-lime" />
              Get full access
            </button>
          </section>

          <div className="sticky bottom-0 -mx-6 mt-10 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-6 py-4 backdrop-blur md:-mx-10 md:px-10">
            <button
              type="submit"
              disabled={!dirty || !draft.model.trim()}
              className="rounded-lg bg-lime px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                setDraft(saved);
                setCustomModel(!providerInfo(saved.provider).models.includes(saved.model));
                setExpanded(saved.provider);
                setStatus("idle");
              }}
              className="rounded-lg px-4 py-2.5 text-sm text-muted hover:text-fg disabled:opacity-40"
            >
              Discard
            </button>
            <span role="status" className="text-xs text-muted">
              {status === "saved"
                ? `Saved · ${providerInfo(saved.provider).label} · ${saved.model}`
                : dirty
                  ? "Unsaved changes"
                  : ""}
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}

function useSectionSpy(rootRef: React.RefObject<HTMLDivElement | null>) {
  const [active, setActive] = useState<SectionID>(SECTION_IDS[0]);
  const locked = useRef<SectionID | null>(null);

  const select = (id: SectionID) => {
    locked.current = id;
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    const compute = () => {
      if (locked.current) return;
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 8) {
        setActive(SECTION_IDS[SECTION_IDS.length - 1]);
        return;
      }
      const line = root.getBoundingClientRect().top + 120;
      let current: SectionID = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        compute();
      });
    };
    const release = () => {
      locked.current = null;
    };

    compute();
    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("wheel", release, { passive: true });
    root.addEventListener("touchmove", release, { passive: true });
    root.addEventListener("pointerdown", release);
    window.addEventListener("keydown", release);
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("wheel", release);
      root.removeEventListener("touchmove", release);
      root.removeEventListener("pointerdown", release);
      window.removeEventListener("keydown", release);
      window.removeEventListener("resize", onScroll);
    };
  }, [rootRef]);

  return { active, select };
}

function SectionSidebar({
  active,
  onSelect,
}: {
  active: SectionID;
  onSelect: (id: SectionID) => void;
}) {
  return (
    <nav aria-label="Settings sections" className="px-3 py-10">
      <p className="px-2 pb-2 text-[10px] font-bold tracking-[0.14em] text-faint uppercase">
        Settings
      </p>
      <ul className="space-y-0.5">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const on = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={on ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(item.id);
                }}
                className={`group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-bold outline-none transition-colors ${
                  on ? "text-fg" : "text-muted hover:bg-raised/60 hover:text-fg"
                }`}
              >
                <Icon className={`nav-icon size-4 ${on ? "text-lime" : ""}`} />
                <span className="truncate">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileSectionNav({
  active,
  onSelect,
}: {
  active: SectionID;
  onSelect: (id: SectionID) => void;
}) {
  return (
    <nav
      aria-label="Settings sections"
      className="nice-scroll -mx-6 mb-8 flex gap-1 overflow-x-auto border-b border-line/70 px-6 pb-3 lg:hidden"
    >
      {SECTIONS.map((item) => {
        const on = active === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(event) => {
              event.preventDefault();
              onSelect(item.id);
            }}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
              on ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        on ? "bg-lime" : "bg-line"
      }`}
    >
      <span
        className={`size-4 rounded-full bg-bg transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}
