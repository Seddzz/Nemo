export type DetectedEntity = {
  label: string;
  text: string;
  start?: number;
  end?: number;
  score?: number;
  source?: string;
};

export type AnonymizeResult = {
  redacted: string;
  entities: DetectedEntity[];
};

export async function anonymizeFile(
  file: File,
  strategy: "placeholder" | "fake",
): Promise<AnonymizeResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("strategy", strategy);
  form.append("ner", "false");
  form.append("output", "text");

  const response = await fetch("/api/anonymize", { method: "POST", body: form });
  const data = (await response.json().catch(() => ({}))) as {
    redacted?: string;
    entities?: DetectedEntity[];
    detail?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.detail ?? data.error ?? `HTTP ${response.status}`);
  }

  return {
    redacted: data.redacted ?? "",
    entities: Array.isArray(data.entities) ? data.entities : [],
  };
}

export function redactedFileName(fileName: string): string {
  return `${fileName.replace(/\.[^.]+$/, "")}.redacted.txt`;
}

export function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
