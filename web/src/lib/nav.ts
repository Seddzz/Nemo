export type NavKey = "dashboard" | "anonymize" | "docs" | "settings";

export const NAV_META: Record<NavKey, { to: string; label: string }> = {
  dashboard: { to: "/dashboard", label: "Dashboard" },
  anonymize: { to: "/anonymize", label: "Anonymize" },
  docs: { to: "/docs", label: "Documentation" },
  settings: { to: "/settings", label: "Settings" },
};

export const NAV_ORDER_DEFAULT: NavKey[] = [
  "dashboard",
  "anonymize",
  "settings",
  "docs",
];

export function orderedNav(order: NavKey[]): NavKey[] {
  const seen = new Set<NavKey>();
  const result: NavKey[] = [];
  for (const key of order) {
    if (!(key in NAV_META) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  for (const key of NAV_ORDER_DEFAULT) {
    if (!seen.has(key)) result.push(key);
  }
  return result;
}
