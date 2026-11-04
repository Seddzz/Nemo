import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "groq", "xai", "compatible"]),
  apiKey: z.string().min(8).max(400),
  model: z.string().min(1).max(120),
  baseUrl: z.string().url().max(200),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(12000),
      }),
    )
    .min(1)
    .max(30),
});

// OpenAI-style chat-completions endpoints. Anthropic is handled separately below.
const ENDPOINTS: Partial<Record<z.infer<typeof schema>["provider"], string>> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: "https://api.groq.com/openai/v1",
  xai: "https://api.x.ai/v1",
};

// Providers word errors differently: OpenAI/Groq send { error: { message } },
// Gemini wraps that in an array, and xAI sends { error: "text" }.
function upstreamError(json: unknown): string | undefined {
  const body = (Array.isArray(json) ? json[0] : json) as { error?: unknown } | undefined;
  const error = body?.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

export const relayChat = createServerFn({ method: "POST" })
  .validator(schema)
  .handler(async ({ data }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      if (data.provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            "x-api-key": data.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: data.model,
            max_tokens: 800,
            system:
              "The user routes messages through a local redaction layer. Tokens like [[PERSON_1]] stand in for private values you must not guess. Answer the question using only what is written.",
            messages: data.messages,
          }),
        });
        const json = (await res.json()) as {
          error?: { message?: string };
          content?: { text?: string }[];
        };
        if (!res.ok) {
          return { ok: false as const, error: json.error?.message || `Upstream ${res.status}` };
        }
        const text = json.content?.map((c) => c.text || "").join("\n").trim() || "";
        return { ok: true as const, text };
      }

      // Known providers are pinned server-side; only "compatible" uses the caller's base URL.
      const root = ENDPOINTS[data.provider] ?? data.baseUrl.replace(/\/$/, "");
      const res = await fetch(`${root}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${data.apiKey}`,
        },
        body: JSON.stringify({
          model: data.model,
          messages: [
            {
              role: "system",
              content:
                "The user routes messages through a local redaction layer. Tokens like [[PERSON_1]] stand in for private values you must not guess. Answer using only what is written.",
            },
            ...data.messages,
          ],
        }),
      });
      const json = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        return { ok: false as const, error: upstreamError(json) || `Upstream ${res.status}` };
      }
      const body = json as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content?.trim() || "";
      return { ok: true as const, text };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Relay failed";
      return { ok: false as const, error: message };
    } finally {
      clearTimeout(timer);
    }
  });
