import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { PROVIDERS, providerInfo, type Provider } from "@/lib/models";
import { useVault, type KeySettings } from "@/lib/store";

export const Route = createFileRoute("/settings")({ component: KeyPage });

const CUSTOM = "__custom__";

function KeyPage() {
  const saved = useVault(
    useShallow((s) => ({
      provider: s.provider,
      apiKey: s.apiKey,
      model: s.model,
      baseUrl: s.baseUrl,
      restoreReplies: s.restoreReplies,
    })),
  );
  const saveKey = useVault((s) => s.saveKey);

  // Edits stay local until Save; the persisted settings only change on submit.
  const [draft, setDraft] = useState<KeySettings>(saved);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [customModel, setCustomModel] = useState(
    () => !providerInfo(saved.provider).models.includes(saved.model),
  );

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

  return (
    <div className="h-full overflow-y-auto">
      <form onSubmit={save} className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-[11px] text-faint">Key</p>
        <h1 className="mt-2 text-2xl text-fg">Bring the model you already use</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          The credential stays in this browser. It is sent only when you press Send, and only with
          the redacted transcript.
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

        <div className="mt-10 flex items-center gap-3 border-t border-line pt-6">
          <button
            type="submit"
            disabled={!dirty || !draft.model.trim()}
            className="rounded-lg bg-fg px-5 py-2.5 text-sm font-medium text-bg disabled:opacity-40"
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
