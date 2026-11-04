let pending = "";

export function queueDraft(text: string) {
  pending = text;
}

export function takeDraft() {
  const text = pending;
  pending = "";
  return text;
}
