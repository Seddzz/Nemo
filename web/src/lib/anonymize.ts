export type EntityKind =
  | "PERSON"
  | "ORG"
  | "EMAIL"
  | "PHONE"
  | "SSN"
  | "CARD"
  | "IP"
  | "IBAN"
  | "DATE"
  | "ADDRESS";

export type Hit = {
  token: string;
  value: string;
  kind: EntityKind;
};

type Span = { start: number; end: number; value: string; kind: EntityKind };

const RULES: { kind: EntityKind; re: RegExp }[] = [
  { kind: "EMAIL", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { kind: "IBAN", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g },
  { kind: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { kind: "CARD", re: /\b(?:\d{4}[ -]?){3}\d{3,4}\b/g },
  { kind: "IP", re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  { kind: "PHONE", re: /(?:\+\d{1,3}[\s.-])?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/g },
  { kind: "DATE", re: /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]\d{2,4})\b/g },
  {
    kind: "ADDRESS",
    re: /\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct)\b/g,
  },
  {
    kind: "PERSON",
    re: /\b(?:Mr|Mrs|Ms|Mx|Dr|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g,
  },
];

const NAME = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,2}\b/g;

const ORG_SUFFIX =
  /\b[A-Z][A-Za-z&]{1,}(?:\s+[A-Z][A-Za-z&]{1,}){0,3}\s+(?:Inc|LLC|Ltd|GmbH|Clinic|Hospital|Bank|University|Labs|Studio)\b/g;

const STOP = new Set([
  "The",
  "This",
  "That",
  "Please",
  "Thanks",
  "Thank",
  "Hello",
  "Dear",
  "From",
  "With",
  "Your",
  "Email",
  "Call",
  "Meet",
  "Send",
  "Ask",
  "Tell",
  "Contact",
  "Reach",
  "About",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]);

function overlaps(spans: Span[], start: number, end: number) {
  return spans.some((s) => start < s.end && end > s.start);
}

function collect(text: string, re: RegExp, kind: EntityKind, spans: Span[]) {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const value = m[0];
    if (!value.trim()) continue;
    if (overlaps(spans, m.index, m.index + value.length)) continue;
    spans.push({ start: m.index, end: m.index + value.length, value, kind });
  }
}

export function anonymize(text: string, prior: Hit[] = [], strict = false): { text: string; hits: Hit[] } {
  const spans: Span[] = [];
  for (const rule of RULES) collect(text, rule.re, rule.kind, spans);
  collect(text, ORG_SUFFIX, "ORG", spans);

  NAME.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NAME.exec(text))) {
    const value = m[0];
    const first = value.split(/\s+/)[0] ?? "";
    if (STOP.has(first)) {
      NAME.lastIndex = m.index + first.length;
      continue;
    }
    if (overlaps(spans, m.index, m.index + value.length)) continue;
    const kind: EntityKind = /(?:Clinic|Hospital|Bank|University|Labs|Studio)$/.test(value)
      ? "ORG"
      : "PERSON";
    spans.push({ start: m.index, end: m.index + value.length, value, kind });
  }

  if (strict) {
    const one = /\b[A-Z][a-z]{3,}\b/g;
    let hit: RegExpExecArray | null;
    while ((hit = one.exec(text))) {
      const value = hit[0];
      if (STOP.has(value)) continue;
      if (overlaps(spans, hit.index, hit.index + value.length)) continue;
      spans.push({ start: hit.index, end: hit.index + value.length, value, kind: "PERSON" });
    }
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const byValue = new Map<string, Hit>();
  const counts: Partial<Record<EntityKind, number>> = {};
  for (const h of prior) {
    byValue.set(`${h.kind}:${h.value}`, h);
    const n = Number(h.token.match(/_(\d+)]]$/)?.[1] ?? 0);
    counts[h.kind] = Math.max(counts[h.kind] ?? 0, n);
  }

  const hits: Hit[] = [];
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    const key = `${span.kind}:${span.value}`;
    let hit = byValue.get(key);
    if (!hit) {
      counts[span.kind] = (counts[span.kind] ?? 0) + 1;
      hit = {
        kind: span.kind,
        value: span.value,
        token: `[[${span.kind}_${counts[span.kind]}]]`,
      };
      byValue.set(key, hit);
    }
    hits.push(hit);
    out += text.slice(cursor, span.start) + hit.token;
    cursor = span.end;
  }
  out += text.slice(cursor);

  const unique: Hit[] = [];
  const seen = new Set<string>();
  for (const h of [...prior, ...hits]) {
    const k = h.token;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(h);
  }
  return { text: out, hits: unique };
}

export function restore(text: string, hits: Hit[]) {
  let out = text;
  const ordered = [...hits].sort((a, b) => b.token.length - a.token.length);
  for (const h of ordered) out = out.split(h.token).join(h.value);
  return out;
}

export const SAMPLE = `Please review the intake for Elena Voss at Northwind Clinic.

She can be reached at elena.voss@northwind.clinic or +1 415 555 0148.
SSN on the form is 219-09-4412. Card used for the deposit: 4242 4242 4242 4242.
Appointment is 2026-03-14 at 88 Harbor Street, Oakland.
Internal note from Dr. Marcus Hale: patient lives near the clinic IP 10.4.12.88 was logged from the kiosk.`;
