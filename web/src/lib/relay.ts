import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const provider = z.enum(["openai", "anthropic", "gemini", "groq", "xai", "compatible"]);

const schema = z.object({
  provider,
  apiKey: z.string().min(8).max(400),
  model: z.string().min(1).max(120),
  baseUrl: z.string().url().max(200),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(60000),
      }),
    )
    .min(1)
    .max(30),
});

const modelsSchema = z.object({
  provider,
  apiKey: z.string().min(8).max(400),
  baseUrl: z.string().url().max(200),
});

const ENDPOINTS: Partial<Record<z.infer<typeof provider>, string>> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: "https://api.groq.com/openai/v1",
  xai: "https://api.x.ai/v1",
};

const MODEL_ENDPOINTS: Partial<Record<z.infer<typeof provider>, string>> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  groq: "https://api.groq.com/openai/v1",
  xai: "https://api.x.ai/v1",
};

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
              "The user routes messages through a local anonymization layer. Tokens like [[PERSON_1]] stand in for private values you must not guess. Answer the question using only what is written.",
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
                "The user routes messages through a local anonymization layer. Tokens like [[PERSON_1]] stand in for private values you must not guess. Answer using only what is written.",
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

export const relayModels = createServerFn({ method: "POST" })
  .validator(modelsSchema)
  .handler(async ({ data }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      let url: string;
      const headers: Record<string, string> = {};

      if (data.provider === "anthropic") {
        url = "https://api.anthropic.com/v1/models";
        headers["x-api-key"] = data.apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else if (data.provider === "gemini") {
        url = `${MODEL_ENDPOINTS.gemini}/models?key=${encodeURIComponent(data.apiKey)}`;
      } else {
        const root = MODEL_ENDPOINTS[data.provider] ?? data.baseUrl.replace(/\/$/, "");
        url = `${root}/models`;
        headers.authorization = `Bearer ${data.apiKey}`;
      }

      const res = await fetch(url, { signal: controller.signal, headers });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { id?: string }[];
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      if (!res.ok) {
        return { ok: false as const, error: upstreamError(json) || `Upstream ${res.status}` };
      }

      const models =
        data.provider === "gemini"
          ? (json.models ?? [])
              .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
              .map((model) => model.name?.replace(/^models\//, ""))
          : (json.data ?? []).map((model) => model.id);
      const ids = [...new Set(models.filter((id): id is string => Boolean(id && id.trim())))].sort();
      return ids.length
        ? { ok: true as const, models: ids }
        : { ok: false as const, error: "The provider returned no usable models." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Model discovery failed";
      return { ok: false as const, error: message };
    } finally {
      clearTimeout(timer);
    }
  });
