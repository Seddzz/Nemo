import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Activity } from "@/lib/store";
import { sampleData } from "@/lib/sample-data";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

const RANGES = [
  { key: "1", label: "Today", days: 1 },
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "365", label: "Last 12 months", days: 365 },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function Dashboard() {
  const sample = useMemo(() => sampleData(365), []);
  const [range, setRange] = useState<RangeKey>("30");
  const active = RANGES.find((r) => r.key === range) ?? RANGES[2];

  const cutoff = useMemo(() => Date.now() - active.days * 86_400_000, [active.days]);
  const activity = useMemo(
    () => sample.activity.filter((a) => a.at >= cutoff),
    [sample.activity, cutoff],
  );

  const entities = activity.reduce((sum, a) => sum + a.entities, 0);
  const documents = activity.filter((a) => a.kind === "document");
  const chats = activity.filter((a) => a.kind === "chat");
  const documentCount = documents.length;
  const messageCount = chats.length;
  const docEntities = documents.reduce((sum, a) => sum + a.entities, 0);
  const chatEntities = chats.reduce((sum, a) => sum + a.entities, 0);
  const kinds = sample.kinds.filter((k) => k.count > 0);

  const series = useMemo(
    () => (active.days >= 365 ? bucketMonths(activity, 12) : bucketDays(activity, active.days)),
    [activity, active.days],
  );
  const peak = series.reduce(
    (best, row) => (row.entities > best.entities ? row : best),
    series[0],
  );
  const entityDelta = delta(series.map((s) => s.entities));
  const docDelta = delta(series.map((s) => s.documents));
  const msgDelta = delta(series.map((s) => s.messages));
  const passes = documentCount + messageCount;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-medium tracking-tight">Dashboard</h1>
            <Link
              to="/anonymize"
              className="rounded-full bg-fg px-3.5 py-1.5 text-xs font-medium text-ink transition-opacity hover:opacity-90"
            >
              New pass
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${
                  range === r.key ? "bg-raised text-fg" : "text-faint hover:text-fg"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Entities anonymized"
              value={entities.toLocaleString()}
              note={`across ${kinds.length} entity types`}
              delta={entityDelta}
              points={series.map((s) => s.entities)}
            />
            <Kpi
              label="Documents anonymized"
              value={documentCount.toLocaleString()}
              note="text files and pastes"
              delta={docDelta}
              points={series.map((s) => s.documents)}
            />
            <Kpi
              label="Messages protected"
              value={messageCount.toLocaleString()}
              note="via your own model key"
              delta={msgDelta}
              points={series.map((s) => s.messages)}
            />
            <Kpi
              label="Kinds in the ledger"
              value={String(kinds.length)}
              note="person, email, phone…"
              delta={null}
              points={series.map((s) => s.entities)}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <section className="rounded-xl border border-line/70 bg-surface/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium">Anonymization details</h2>
                <span className="text-[11px] text-faint">{active.label}</span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line/60 text-[10px] tracking-wide text-faint uppercase">
                      <th className="pb-2 pr-3 font-medium">Source type</th>
                      <th className="pb-2 pr-3 text-right font-medium">Passes</th>
                      <th className="pb-2 pr-3 text-right font-medium">Entities</th>
                      <th className="pb-2 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    <DetailRow
                      label="Documents"
                      passes={documentCount}
                      entities={docEntities}
                      share={entities ? docEntities / entities : 0}
                    />
                    <DetailRow
                      label="Chats"
                      passes={messageCount}
                      entities={chatEntities}
                      share={entities ? chatEntities / entities : 0}
                    />
                    <tr className="text-muted">
                      <td className="pt-3 font-medium text-fg">Total</td>
                      <td className="pt-3 text-right tabular-nums">{passes.toLocaleString()}</td>
                      <td className="pt-3 text-right tabular-nums">{entities.toLocaleString()}</td>
                      <td className="pt-3 text-right tabular-nums">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-line/70 bg-surface/60 p-4">
              <h2 className="text-sm font-medium">Ledger breakdown</h2>
              <ul className="mt-3 space-y-2.5">
                {kinds.slice(0, 7).map((k) => {
                  const count = Math.round((k.count / Math.max(1, sample.entities)) * entities);
                  return (
                    <li
                      key={k.kind}
                      className="flex items-center justify-between gap-3 text-[12px]"
                    >
                      <span className="text-muted">{k.kind.toLowerCase()}</span>
                      <span className="text-fg tabular-nums">{count.toLocaleString()}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5 text-[12px]">
                <span className="text-muted">Net entities</span>
                <span className="text-fg tabular-nums">{entities.toLocaleString()}</span>
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-xl border border-line/70 bg-surface/60 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-sm font-medium">Overview</h2>
              <span className="text-[11px] text-faint">
                {peak && peak.entities > 0
                  ? `Peak ${peak.entities.toLocaleString()} on ${peak.full}`
                  : "No activity in this range"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Entities" value={entities} />
              <Stat label="Passes" value={passes} highlight />
              <Stat label="Messages" value={messageCount} />
            </div>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-fg)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--color-fg)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-line)" />
                  <XAxis
                    dataKey="axis"
                    interval="preserveStartEnd"
                    tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={36}
                    allowDecimals={false}
                    tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--color-line)" }}
                    content={({ active: hovered, payload }) => {
                      if (!hovered || !payload?.length) return null;
                      const row = payload[0].payload as (typeof series)[number];
                      return (
                        <div className="rounded-lg border border-line bg-raised px-3 py-2 text-xs">
                          <div className="text-faint">{row.full}</div>
                          <div className="mt-0.5 font-medium">
                            {row.entities.toLocaleString()} entities
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="entities"
                    stroke="var(--color-fg)"
                    strokeWidth={1.5}
                    fill="url(#dashFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  delta,
  points,
}: {
  label: string;
  value: string;
  note: string;
  delta: number | null;
  points: number[];
}) {
  return (
    <article className="rounded-xl border border-line/70 bg-surface/60 px-4 py-4">
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
        <span>{label}</span>
        {delta !== null && (
          <span className="text-faint">
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-2xl tracking-tight">{value}</div>
        <Spark points={points} />
      </div>
      <p className="mt-2 text-[11px] text-faint">{note}</p>
    </article>
  );
}

function DetailRow({
  label,
  passes,
  entities,
  share,
}: {
  label: string;
  passes: number;
  entities: number;
  share: number;
}) {
  return (
    <tr className="border-b border-line/40 text-muted">
      <td className="py-2.5 pr-3 text-fg">{label}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{passes.toLocaleString()}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{entities.toLocaleString()}</td>
      <td className="py-2.5 text-right tabular-nums">{(share * 100).toFixed(1)}%</td>
    </tr>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg px-4 py-3 ${highlight ? "bg-raised" : ""}`}>
      <div className="text-[11px] text-faint">{label}</div>
      <div className="mt-1 text-2xl tracking-tight">{value.toLocaleString()}</div>
    </div>
  );
}

function Spark({ points }: { points: number[] }) {
  const width = 88;
  const height = 28;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const d = points
    .map((n, i) => {
      const x = i * step;
      const y = height - (n / max) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-20 text-muted" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function delta(values: number[]) {
  const mid = Math.floor(values.length / 2);
  const prev = values.slice(0, mid).reduce((a, b) => a + b, 0);
  const next = values.slice(mid).reduce((a, b) => a + b, 0);
  if (prev === 0) return next === 0 ? 0 : null;
  return ((next - prev) / prev) * 100;
}

type Bucket = {
  key: string;
  entities: number;
  documents: number;
  messages: number;
  label: string;
  axis: string;
  full: string;
  today: boolean;
};

function bucketDays(activity: Activity[], days: number): Bucket[] {
  // UTC days throughout, so the server render and the browser bucket identically.
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const fmt = { month: "short", day: "numeric", timeZone: "UTC" } as const;
  const rows: Bucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setUTCDate(now.getUTCDate() - i);
    const key = day.toISOString().slice(0, 10);
    const hits = activity.filter((a) => new Date(a.at).toISOString().slice(0, 10) === key);
    const label = day.toLocaleDateString("en-US", fmt);
    rows.push({
      key,
      entities: hits.reduce((sum, a) => sum + a.entities, 0),
      documents: hits.filter((a) => a.kind === "document").length,
      messages: hits.filter((a) => a.kind === "chat").length,
      label,
      axis: i === 0 ? "Today" : label,
      full: i === 0 ? "Today" : label,
      today: i === 0,
    });
  }
  return rows;
}

function bucketMonths(activity: Activity[], months: number): Bucket[] {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const rows: Bucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const hits = activity.filter((a) => {
      const at = new Date(a.at);
      return at >= start && at < end;
    });
    const label = start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    rows.push({
      key: start.toISOString().slice(0, 7),
      entities: hits.reduce((sum, a) => sum + a.entities, 0),
      documents: hits.filter((a) => a.kind === "document").length,
      messages: hits.filter((a) => a.kind === "chat").length,
      label,
      axis: label,
      full: label,
      today: i === 0,
    });
  }
  return rows;
}
