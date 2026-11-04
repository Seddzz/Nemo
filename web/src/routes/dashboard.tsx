import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Activity } from "@/lib/store";
import { sampleData } from "@/lib/sample-data";


export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const sample = useMemo(() => sampleData(30), []);
  const documents = sample.documents;
  const entities = sample.entities;
  const messagesRouted = sample.messages;
  const activity = sample.activity;
  const mix = sample.kinds.filter((k) => k.count > 0).sort((a, b) => b.count - a.count);

  const series = useMemo(() => bucket(activity, 30), [activity]);
  const peak = series.reduce((best, row) => (row.entities > best.entities ? row : best), series[0]);
  const kinds = mix.length;
  const recent = activity.slice(0, 8);
  const entityDelta = delta(series.map((s) => s.entities));
  const docDelta = delta(series.map((s) => s.documents));
  const msgDelta = delta(series.map((s) => s.messages));

  const summary =
    `Across the last 30 days, ${documents} documents and ${messagesRouted} messages were anonymized, ` +
    `masking ${entities.toLocaleString()} sensitive spans across ${kinds} entity types. ` +
    `${peak && peak.entities > 0 ? `Peak activity reached ${peak.entities.toLocaleString()} entities on ${peak.full}.` : "No activity yet."}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
          <p className="text-sm leading-relaxed text-muted">
            {summary}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Entities anonymized"
              value={entities.toLocaleString()}
              note={`across ${kinds} entity types`}
              delta={entityDelta}
              points={series.map((s) => s.entities)}
            />
            <Kpi
              label="Documents anonymized"
              value={documents.toLocaleString()}
              note="text files and pastes"
              delta={docDelta}
              points={series.map((s) => s.documents)}
            />
            <Kpi
              label="Messages protected"
              value={messagesRouted.toLocaleString()}
              note="via your own model key"
              delta={msgDelta}
              points={series.map((s) => s.messages)}
            />
            <Kpi
              label="Kinds in the ledger"
              value={String(kinds)}
              note="person, email, phone…"
              delta={null}
              points={series.map((s) => s.entities)}
            />
          </div>

          <section
            className="rise mt-4 rounded-2xl border border-line bg-surface p-4 md:p-5"
            style={{ animationDelay: "140ms" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Entities anonymized per day</h2>
                <p className="mt-1 text-[13px] text-muted">
                  {peak && peak.entities > 0
                    ? `Peak of ${peak.entities.toLocaleString()} on ${peak.full}`
                    : "No anonymizations in this range yet"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-faint">
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-2 rounded-sm bg-[#3a3a3a]" /> Daily total
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-2 rounded-sm bg-lime" /> Today
                </span>
              </div>
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} barCategoryGap="28%">
                  <CartesianGrid vertical={false} stroke="#242424" />
                  <XAxis
                    dataKey="axis"
                    interval="preserveStartEnd"
                    tick={{ fill: "#8d8d8d", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={36}
                    allowDecimals={false}
                    tick={{ fill: "#8d8d8d", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
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
                  <Bar
                    dataKey="entities"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive
                    animationDuration={700}
                  >
                    {series.map((row) => (
                      <Cell key={row.key} fill={row.today ? "#c8ff00" : "#3a3a3a"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <section
              className="rise rounded-2xl border border-line bg-surface p-4 md:p-5"
              style={{ animationDelay: "200ms" }}
            >
              <h2 className="text-sm font-medium">Entity mix</h2>
              <p className="mt-1 text-[13px] text-muted">What was anonymized, by type</p>
              {mix.length === 0 ? (
                <p className="mt-6 text-[13px] text-faint">Nothing anonymized yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {mix.map((k) => {
                    const share = k.count / Math.max(1, mix[0].count);
                    return (
                      <li key={k.kind} className="text-[12px]">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted">{k.kind.toLowerCase()}</span>
                          <span className="tabular-nums">{k.count.toLocaleString()}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-raised">
                          <div
                            className="h-full rounded-full bg-lime"
                            style={{ width: `${Math.max(4, share * 100)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section
              className="rise rounded-2xl border border-line bg-surface p-4 md:p-5"
              style={{ animationDelay: "260ms" }}
            >
              <h2 className="text-sm font-medium">Recent activity</h2>
              <p className="mt-1 text-[13px] text-muted">Latest chats and documents</p>
              {recent.length === 0 ? (
                <p className="mt-6 text-[13px] text-faint">
                  No activity yet. Send a chat or anonymize a file.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {recent.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] tracking-wide uppercase ${
                          a.kind === "document" ? "bg-raised text-fg" : "bg-raised text-muted"
                        }`}
                      >
                        {a.kind === "document" ? "Doc" : "Chat"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{a.title}</span>
                      <span className="shrink-0 text-[12px] text-muted tabular-nums">
                        {a.entities} masked
                      </span>
                      <span
                        className="w-14 shrink-0 text-right text-[11px] text-faint"
                        suppressHydrationWarning
                      >
                        {when(a.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
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
    <article className="rise rounded-2xl border border-line bg-surface px-4 py-4">
      <div className="flex items-center justify-between gap-2 text-[12px] text-muted">
        <span>{label}</span>
        {delta !== null && (
          <span className={delta >= 0 ? "text-lime" : "text-danger"}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-3xl tracking-tight">{value}</div>
        <Spark points={points} />
      </div>
      <p className="mt-2 text-[12px] text-faint">{note}</p>
    </article>
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
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-24 text-lime" aria-hidden>
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

function bucket(activity: Activity[], days: number) {
  // UTC days throughout, so the server render and the browser bucket identically.
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const fmt = { month: "short", day: "numeric", timeZone: "UTC" } as const;
  const rows = [];
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

function when(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
