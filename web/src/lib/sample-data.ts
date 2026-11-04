import type { EntityKind } from "@/lib/anonymize";
import type { Activity } from "@/lib/store";

// Synthetic usage for previewing the dashboard. Seeded, so the server render and the
// browser produce the same numbers.

const TITLES = {
  chat: [
    "Draft reply to the landlord about the deposit",
    "Summarize patient intake notes",
    "Rewrite the offer letter for Dr. Amal Haddad",
    "Explain this invoice dispute",
    "Check the NDA for missing clauses",
    "Translate the HR complaint to English",
    "Prepare talking points for the bank call",
    "Review the loan application summary",
    "Plan the onboarding email for new hires",
    "Clean up meeting notes from Tuesday",
  ],
  document: [
    "lease-agreement-2026.pdf",
    "payroll-october.csv",
    "medical-referral.docx",
    "customer-export.json",
    "board-minutes-q3.txt",
    "insurance-claim.pdf",
    "support-tickets.csv",
    "contract-redlines.docx",
  ],
} as const;

const KINDS: { kind: EntityKind; weight: number }[] = [
  { kind: "PERSON", weight: 34 },
  { kind: "EMAIL", weight: 18 },
  { kind: "PHONE", weight: 13 },
  { kind: "ORG", weight: 10 },
  { kind: "DATE", weight: 9 },
  { kind: "ADDRESS", weight: 7 },
  { kind: "IBAN", weight: 4 },
  { kind: "CARD", weight: 3 },
  { kind: "IP", weight: 2 },
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SampleData = {
  activity: Activity[];
  documents: number;
  messages: number;
  entities: number;
  kinds: { kind: EntityKind; count: number }[];
};

export function sampleData(days = 90): SampleData {
  // Everything runs on UTC days so the server (any timezone) and the browser agree.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // Re-seed per day so the numbers are stable all day.
  const rand = rng(Math.floor(today.getTime() / 86_400_000));
  const activity: Activity[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - i);
    const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    // Usage grows over the period, dips on weekends.
    const trend = 0.6 + (1 - i / days) * 1.2;
    const events = Math.round((weekend ? 1.5 : 4.5) * trend * (0.5 + rand()));
    for (let e = 0; e < events; e++) {
      const kind = rand() < 0.3 ? "document" : "chat";
      const pool = TITLES[kind];
      const at = new Date(day);
      at.setUTCHours(8 + Math.floor(rand() * 11), Math.floor(rand() * 60));
      // Keep today's events in the past; round to the minute so both renders match.
      const cap = Math.floor(Date.now() / 60_000) * 60_000;
      if (i === 0 && at.getTime() > cap) at.setTime(cap - (e + 1) * 600_000);
      activity.push({
        id: `sample-${i}-${e}`,
        kind,
        title: pool[Math.floor(rand() * pool.length)],
        entities: kind === "document" ? 6 + Math.floor(rand() * 28) : 1 + Math.floor(rand() * 7),
        at: at.getTime(),
      });
    }
  }

  activity.sort((a, b) => b.at - a.at);
  const entities = activity.reduce((sum, a) => sum + a.entities, 0);
  const totalWeight = KINDS.reduce((s, k) => s + k.weight, 0);
  const kinds = KINDS.map((k) => ({
    kind: k.kind,
    count: Math.round((entities * k.weight) / totalWeight),
  }));

  return {
    activity,
    documents: activity.filter((a) => a.kind === "document").length,
    messages: activity.filter((a) => a.kind === "chat").length,
    entities,
    kinds,
  };
}
