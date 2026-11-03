"use client";

import { X } from "lucide-react";
import { useState } from "react";

import type { ChatSettings } from "./app-context";

type SettingsModalProps = {
  settings: ChatSettings;
  onClose: () => void;
  onSave: (next: ChatSettings) => void;
};

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50";

const labelClass = "text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase";

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [engineUrl, setEngineUrl] = useState(settings.engineUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);

  function save() {
    onSave({
      displayName: displayName.trim(),
      engineUrl: engineUrl.trim() || "http://localhost:8000",
      apiKey: apiKey.trim(),
      model: model.trim() || "openai/gpt-oss-120b",
    });
    onClose();
  }

  return (
    <div
      className="animate-fade fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="set-display-name">
              Display name
            </label>
            <input
              id="set-display-name"
              className={inputClass}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How Nemo greets you"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="set-engine-url">
              Anonymizer engine URL
            </label>
            <input
              id="set-engine-url"
              className={inputClass}
              value={engineUrl}
              onChange={(event) => setEngineUrl(event.target.value)}
              placeholder="http://localhost:8000"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="set-api-key">
              Groq API key
            </label>
            <input
              id="set-api-key"
              className={inputClass}
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="gsk_â€¦"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="set-model">
              Model
            </label>
            <input
              id="set-model"
              className={inputClass}
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="openai/gpt-oss-120b"
            />
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-3.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="h-9 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
