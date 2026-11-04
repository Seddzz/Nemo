import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { PROVIDERS, providerInfo, type Provider } from "@/lib/models";
import { NAV_META, NAV_ORDER_DEFAULT, orderedNav, type NavKey } from "@/lib/nav";
import { prettyShortcut, shortcutFromEvent } from "@/lib/shortcuts";
import { useVault, type AnonymizeScope, type KeySettings } from "@/lib/store";

export const Route = createFileRoute("/settings")({ component: KeyPage });

const CUSTOM = "__custom__";

const SCOPES: { id: AnonymizeScope; label: string; note: string }[] = [
  { id: "both", label: "Prompt and files", note: "Anonymize the message and any attached text." },
  { id: "file", label: "Files only", note: "Leave the prompt as written, mask attached text." },
  { id: "text", label: "Prompt only", note: "Mask the prompt, leave attached text as written." },
];

function KeyPage() {
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

  // Edits stay local until Save; the persisted settings only change on submit.
  const [draft, setDraft] = useState<KeySettings>(saved);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [customModel, setCustomModel] = useState(
    () => !providerInfo(saved.provider).models.includes(saved.model),
  );
  const [recording, setRecording] = useState(false);

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
    <div className="h-full overflow-y-auto">
      <form onSubmit={save} className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-[11px] text-faint">Settings</p>
        <h1 className="mt-2 text-2xl text-fg">Bring the model you already use</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          The credential stays in this browser. It is sent only when you press Send, and only with
          the anonymized transcript.
        </p>

        <fieldset className="mt-10">
          <legend className="text-xs tracking-wide text-faint uppercase">Provider</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={draft.provider === p.id}
                onClick={() => pickProvider(p.id)}
                className={`rounded-lg border px-4 py-4 text-left ${
                  draft.provider === p.id ? "border-fg bg-raised" : "border-line hover:bg-raised"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm">{p.label}</span>
                  {saved.provider === p.id && (
                    <span className="text-[10px] tracking-wide text-faint uppercase">In use</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-fg/80">{p.family}</div>
                <div className="mt-0.5 text-xs text-muted">{p.note}</div>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-8 block">
          <span className="text-xs tracking-wide text-faint uppercase">API key</span>
          <input
            type="password"
            value={draft.apiKey}
            autoComplete="off"
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder={info.keyHint}
            className="mt-2 w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-fg"
          />
        </label>

        <div className="mt-6">
          <label className="block">
            <span className="text-xs tracking-wide text-faint uppercase">Model</span>
            {info.models.length > 0 && (
              <select
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
                className="mt-2 w-full appearance-none rounded-lg border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-fg"
              >
                {info.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value={CUSTOM}>Custom model…</option>
              </select>
            )}
          </label>
          {(customModel || info.models.length === 0) && (
            <input
              value={draft.model}
              onChange={(e) => update({ model: e.target.value })}
              placeholder="Exact model id, e.g. my-model-v2"
              aria-label="Custom model id"
              className="mt-2 w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-fg"
            />
          )}
        </div>

        {draft.provider === "compatible" && (
          <label className="mt-6 block">
            <span className="text-xs tracking-wide text-faint uppercase">Base URL</span>
            <input
              value={draft.baseUrl}
              onChange={(e) => update({ baseUrl: e.target.value })}
              className="mt-2 w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-fg"
            />
          </label>
        )}

        <label className="mt-8 flex items-start gap-3">
          <input
            type="checkbox"
            checked={draft.restoreReplies}
            onChange={(e) => update({ restoreReplies: e.target.checked })}
            className="mt-1"
          />
          <span>
            <span className="block text-sm">Restore tokens in replies</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              After the model answers, known tokens are replaced with your originals locally. The
              model still never saw them.
            </span>
          </span>
        </label>

        <fieldset className="mt-10">
          <legend className="text-xs tracking-wide text-faint uppercase">Anonymization</legend>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {SCOPES.map((scope) => (
              <button
                key={scope.id}
                type="button"
                aria-pressed={draft.anonymizeScope === scope.id}
                onClick={() => update({ anonymizeScope: scope.id })}
                className={`rounded-lg border px-4 py-3 text-left ${
                  draft.anonymizeScope === scope.id
                    ? "border-lime bg-raised"
                    : "border-line hover:bg-raised"
                }`}
              >
                <span className="block text-sm font-bold">{scope.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{scope.note}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-xs tracking-wide text-faint uppercase">Toggle shortcut</span>
            <button
              type="button"
              onClick={() => setRecording((on) => !on)}
              className={`min-w-40 rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
                recording ? "border-lime bg-lime text-ink" : "border-line bg-surface hover:bg-raised"
              }`}
            >
              {recording ? "Press keys…" : prettyShortcut(draft.anonymizeShortcut)}
            </button>
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
        </fieldset>

        <fieldset className="mt-10">
          <legend className="text-xs tracking-wide text-faint uppercase">Sidebar</legend>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Choose the order of the sidebar. Documentation sits last by default and Account is
            always pinned to the bottom.
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-line">
            {orderedNav(navOrder).map((key: NavKey, index) => (
              <div
                key={key}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  index > 0 ? "border-t border-line" : ""
                }`}
              >
                <span className="flex-1 text-sm font-bold">{NAV_META[key].label}</span>
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
        </fieldset>

        <div className="mt-10 flex items-center gap-3 border-t border-line pt-6">
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
      </form>
    </div>
  );
}
