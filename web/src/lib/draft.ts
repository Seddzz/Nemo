import type { Attachment } from "@/lib/store";

export type Draft = {
  text: string;
  attachments: Attachment[];
  anonymize: boolean;
};

let pending: Draft | null = null;

export function queueDraft(draft: Draft) {
  pending = draft;
}

export function takeDraft() {
  const draft = pending;
  pending = null;
  return draft;
}
