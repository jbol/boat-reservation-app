import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { statsSince } from "@/lib/analytics";
import { AdminNav, LoginCard } from "../ui";

const RANGES = [7, 30, 90] as const;

function pct(part: number, whole: number): string {
  return whole === 0 ? "—" : `${((100 * part) / whole).toFixed(1)}%`;
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (!(await isAdmin())) return <LoginCard />;

  const days = RANGES.find((r) => String(r) === sp.days) ?? 30;
  const stats = await statsSince(prisma, days);
  const sources = ["card", "booking", "schedule", "reservation"];

  return (
    <div>
      <AdminNav active="stats" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Stats</h1>
          <p className="text-sm text-slate-600">
            First-party counts, no cookies: page views, daily unique visitors and clicks on the
            buy buttons. Bots and command-line fetches are not counted.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/stats?days=${r}`}
              className={`rounded-lg px-3 py-1.5 font-semibold ${days === r ? "bg-sky-700 text-white" : "border border-slate-300 hover:bg-slate-100"}`}
            >
              {r} days
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Page views", stats.views],
          ["Unique visitors", stats.visitors],
          ["Buy clicks", stats.clicks],
          ["Clicks per visitor", pct(stats.clicks, stats.visitors)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Buy clicks by operator</h2>
        <p className="mb-3 text-xs text-slate-500">
          What each operator received from us in the period — the number to show them.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Operator</th>
                <th className="py-2 pr-3 text-right">Clicks</th>
                <th className="py-2 pr-3 text-right">Share</th>
                {sources.map((s) => (
                  <th key={s} className="py-2 pr-3 text-right">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {stats.byOperator.map((o) => (
                <tr key={o.operatorId}>
                  <td className="py-2 pr-3 font-medium">{o.name}</td>
                  <td className="py-2 pr-3 text-right">{o.clicks}</td>
                  <td className="py-2 pr-3 text-right">{pct(o.clicks, stats.clicks)}</td>
                  {sources.map((s) => (
                    <td key={s} className="py-2 pr-3 text-right text-slate-600">
                      {o.bySource[s] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">By day</h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Day</th>
                <th className="py-2 pr-3 text-right">Views</th>
                <th className="py-2 pr-3 text-right">Visitors</th>
                <th className="py-2 text-right">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {stats.byDay.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-slate-500">
                    Nothing recorded yet.
                  </td>
                </tr>
              )}
              {stats.byDay.map((d) => (
                <tr key={d.dateKey}>
                  <td className="py-1.5 pr-3">{d.dateKey}</td>
                  <td className="py-1.5 pr-3 text-right">{d.views}</td>
                  <td className="py-1.5 pr-3 text-right">{d.visitors}</td>
                  <td className="py-1.5 text-right">{d.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold">Pages</h2>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {stats.byPath.map((p) => (
                  <tr key={p.path}>
                    <td className="py-1.5 pr-3 font-mono text-xs">{p.path}</td>
                    <td className="py-1.5 text-right">{p.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold">Came from</h2>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {stats.byReferrer.length === 0 && (
                  <tr>
                    <td className="py-1.5 text-slate-500">No off-site referrers yet.</td>
                  </tr>
                )}
                {stats.byReferrer.map((r) => (
                  <tr key={r.host}>
                    <td className="py-1.5 pr-3">{r.host}</td>
                    <td className="py-1.5 text-right">{r.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">
              Devices:{" "}
              {Object.entries(stats.byDevice)
                .map(([k, v]) => `${k} ${v}`)
                .join(" · ") || "—"}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
