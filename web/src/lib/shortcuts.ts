export type ShortcutParts = {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
};

const MODIFIER_KEYS = new Set(["control", "meta", "alt", "shift"]);

export function parseShortcut(shortcut: string): ShortcutParts {
  const parts = shortcut
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const key = (parts.pop() ?? "").toLowerCase();
  const mods = new Set(parts.map((part) => part.toLowerCase()));
  return {
    ctrl: mods.has("ctrl") || mods.has("control"),
    meta: mods.has("meta") || mods.has("cmd") || mods.has("command") || mods.has("win"),
    alt: mods.has("alt") || mods.has("option"),
    shift: mods.has("shift"),
    key,
  };
}

export function eventMatchesShortcut(event: KeyboardEvent, shortcut: string) {
  const parts = parseShortcut(shortcut);
  if (!parts.key) return false;
  const key = event.key.toLowerCase();
  return (
    key === parts.key &&
    event.ctrlKey === parts.ctrl &&
    event.metaKey === parts.meta &&
    event.altKey === parts.alt &&
    event.shiftKey === parts.shift
  );
}

export function shortcutFromEvent(event: KeyboardEvent): string | null {
  const key = event.key;
  if (!key || MODIFIER_KEYS.has(key.toLowerCase())) return null;
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.metaKey) parts.push("Meta");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(key.length === 1 ? key.toUpperCase() : key);
  return parts.join("+");
}

export function prettyShortcut(shortcut: string) {
  const parts = parseShortcut(shortcut);
  const mods: string[] = [];
  if (parts.ctrl) mods.push("Ctrl");
  if (parts.meta) mods.push("Meta");
  if (parts.alt) mods.push("Alt");
  if (parts.shift) mods.push("Shift");
  const key = parts.key.length === 1 ? parts.key.toUpperCase() : parts.key;
  return [...mods, key].filter(Boolean).join(" + ");
}
