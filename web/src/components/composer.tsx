import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MarkPlus } from "@/components/marks";
import { queueDraft } from "@/lib/draft";
import { providerInfo } from "@/lib/models";
import { useVault } from "@/lib/store";

export function Composer({
  onSend,
  busy,
}: {
  onSend?: (text: string) => void;
  busy?: boolean;
}) {
  const [value, setValue] = useState("");
  const model = useVault((s) => s.model);
  const provider = useVault((s) => s.provider);
  const hasKey = useVault((s) => s.apiKey.trim().length > 8);
  const strict = useVault((s) => s.strict);
  const setStrict = useVault((s) => s.setStrict);
  const navigate = useNavigate();

  function submit() {
    const text = value.trim();
    if (!text || busy) return;
    setValue("");
    if (onSend) onSend(text);
    else {
      queueDraft(text);
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
      <div className="rounded-2xl border border-line bg-raised px-3 pt-3 pb-2">
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
          placeholder="Give Nemo a task"
          className="max-h-40 min-h-12 w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed outline-none placeholder:text-faint"
        />
        <div className="mt-1 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/anonymize" })}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-fg"
            aria-label="Redact a file"
          >
            <MarkPlus className="size-4" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void navigate({ to: "/settings" })}
              className="rounded-full px-2 py-1 text-[12px] text-muted hover:bg-bg hover:text-fg"
            >
              {who} · {label}
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={strict}
              aria-label="Strict"
              onClick={() => setStrict(!strict)}
              className="flex items-center gap-2"
            >
              <span className="text-[13px] font-semibold text-muted transition-colors hover:text-fg">Strict</span>
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
              disabled={busy || !value.trim()}
              aria-label="Send"
              className="flex size-8 items-center justify-center rounded-full bg-fg text-ink disabled:opacity-40"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <path d="M8 12.5V3.5M4.5 6.5 8 3.5l3.5 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
