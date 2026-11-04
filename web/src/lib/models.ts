// Providers the relay can talk to, with the endpoint and model presets for each.
// Every provider except Anthropic speaks the OpenAI chat-completions API.

export type Provider = "openai" | "anthropic" | "gemini" | "groq" | "xai" | "compatible";

export type ProviderInfo = {
  id: Provider;
  label: string;
  family: string;
  note: string;
  baseUrl: string;
  keyHint: string;
  models: string[];
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "openai",
    label: "OpenAI",
    family: "ChatGPT models",
    note: "GPT-5, GPT-4.1, GPT-4o",
    baseUrl: "https://api.openai.com/v1",
    keyHint: "sk-…",
    models: [
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4o",
      "gpt-4o-mini",
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    family: "Claude models",
    note: "Opus, Sonnet, Haiku",
    baseUrl: "https://api.anthropic.com",
    keyHint: "sk-ant-…",
    models: [
      "claude-opus-5-5",
      "claude-sonnet-5-5",
      "claude-haiku-5-5",
      "claude-sonnet-4-5",
      "claude-haiku-4-5",
    ],
  },
  {
    id: "gemini",
    label: "Google",
    family: "Gemini models",
    note: "Gemini 2.5 Pro and Flash",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyHint: "AIza…",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
  },
  {
    id: "groq",
    label: "Groq",
    family: "Open models, fast",
    note: "Free tier, good for testing",
    baseUrl: "https://api.groq.com/openai/v1",
    keyHint: "gsk_…",
    models: [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
    ],
  },
  {
    id: "xai",
    label: "xAI",
    family: "Grok models",
    note: "Grok 4 and Grok 3",
    baseUrl: "https://api.x.ai/v1",
    keyHint: "xai-…",
    models: ["grok-4", "grok-4-fast", "grok-3", "grok-3-mini"],
  },
  {
    id: "compatible",
    label: "Compatible",
    family: "Any OpenAI-style API",
    note: "Bring your own base URL",
    baseUrl: "https://api.openai.com/v1",
    keyHint: "Your provider's key",
    models: [],
  },
];

export function providerInfo(id: Provider): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
