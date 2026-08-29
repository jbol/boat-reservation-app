import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import Link from "next/link";
import {
  adminApplyOperatorTimetables,
  adminDeleteTimetable,
  adminMarkOperatorVerified,
  adminSaveTimetable,
} from "@/lib/actions";
import { timesOf } from "@/lib/timetables";
import { driftFlags } from "@/lib/scheduleWatch";
import { AdminNav, LoginCard } from "../ui";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TimetableFields({
  defaults,
}: {
  defaults?: { validFrom: string; validTo: string; daysMask: string; times: string[] };
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 text-xs">
      <label className="flex flex-col gap-1 font-medium text-slate-600">
        From
        <input type="date" name="validFrom" required defaultValue={defaults?.validFrom} className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 font-medium text-slate-600">
        To
        <input type="date" name="validTo" required defaultValue={defaults?.validTo} className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <fieldset className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1">
        {DAY_LABELS.map((label, i) => (
          <label key={label} className="flex flex-col items-center gap-0.5 text-[10px] text-slate-500">
            {label}
            <input type="checkbox" name={`day${i}`} defaultChecked={defaults ? defaults.daysMask[i] === "1" : true} />
          </label>
        ))}
      </fieldset>
      <label className="flex min-w-56 flex-1 flex-col gap-1 font-medium text-slate-600">
        Departure times (comma-separated, HH:MM)
        <input
          type="text"
          name="times"
          required
          defaultValue={defaults?.times.join(", ")}
          placeholder="09:45, 10:45, 12:00"
          className="rounded border border-slate-300 px-2 py-1 font-mono"
        />
      </label>
    </div>
  );
}

export default async function AdminTimetablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (!(await isAdmin())) return <LoginCard />;

  const [operators, drift] = await Promise.all([
    prisma.operator.findMany({
      where: { scheduleVerified: true },
      orderBy: { name: "asc" },
      include: {
        routes: {
          include: { originPort: true, timetables: { orderBy: [{ validFrom: "asc" }, { id: "asc" }] } },
        },
      },
    }),
    driftFlags(),
  ]);
  const operatorName = new Map(operators.map((o) => [o.id, o.name]));

  // Per-company tabs — schedule changes arrive one operator at a time.
  const tab =
    typeof sp.operator === "string" && operators.some((o) => o.slug === sp.operator)
      ? sp.operator
      : "";
  const visibleOperators = operators.filter((o) => !tab || o.slug === tab);

  const banner =
    typeof sp.applied === "string"
      ? `Applied ${operatorName.get(sp.applied) ?? sp.applied}: ${sp.created} created · ${sp.cancelled} cancelled (booked) · ${sp.deleted} removed · ${sp.kept} unchanged`
      : sp.saved
        ? "Pattern saved. Remember to apply the route's timetables to update the sailings."
        : sp.error === "invalid"
          ? "Invalid pattern: check dates, at least one weekday, and HH:MM times."
          : sp.error === "nopatterns"
            ? "That route has no patterns to apply."
            : sp.error === "expired"
              ? "All patterns on that route end in the past — extend a validity window first."
              : "";

  return (
    <div>
      <AdminNav active="timetables" />
      <h1 className="mb-1 text-xl font-bold">Timetables</h1>
      <p className="mb-4 max-w-2xl text-sm text-slate-600">
        Patterns are the source of truth for schedules. Edit or add patterns, then{" "}
        <strong>Apply</strong> to materialize sailings from today onward: new departures are
        created, vanished ones with bookings are cancelled (optionally emailing customers),
        empty ones are removed. Weather cancellations are never resurrected.
      </p>

      {drift.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">⚠ Schedule pages changed since last verification:</p>
          <ul className="mt-1 list-disc pl-5">
            {drift.map((f) => (
              <li key={f.operatorId}>
                {operatorName.get(f.operatorId) ?? f.operatorId} — page changed{" "}
                {f.lastChangedAt.toISOString().slice(0, 10)} ·{" "}
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline">
                  view page
                </a>
                . Re-verify, update the patterns if needed, then &ldquo;Mark verified today&rdquo;.
              </li>
            ))}
          </ul>
        </div>
      )}

      {banner && (
        <p className={`mb-4 rounded-lg border p-3 text-sm ${sp.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {banner}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/admin/timetables"
          className={`rounded-lg px-3 py-1.5 font-semibold ${!tab ? "bg-sky-700 text-white" : "border border-slate-300 hover:bg-slate-100"}`}
        >
          All companies
        </Link>
        {operators.map((o) => (
          <Link
            key={o.slug}
            href={`/admin/timetables?operator=${o.slug}`}
            className={`rounded-lg px-3 py-1.5 font-semibold ${tab === o.slug ? "bg-sky-700 text-white" : "border border-slate-300 hover:bg-slate-100"}`}
          >
            {o.name}
          </Link>
        ))}
      </div>

      <div className="space-y-8">
        {visibleOperators.map((op) => (
          <section key={op.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold">{op.name}</h2>
                <form action={adminMarkOperatorVerified} className="flex items-center gap-2 text-xs text-slate-500">
                  <span>
                    verified:{" "}
                    {op.scheduleCheckedAt ? op.scheduleCheckedAt.toISOString().slice(0, 10) : "never"}
                  </span>
                  <input type="hidden" name="operatorId" value={op.id} />
                  <button type="submit" className="rounded border border-slate-300 px-2 py-1 font-semibold hover:bg-slate-100">
                    Mark verified today
                  </button>
                </form>
              </div>
              {/* One apply per company — covers outbound AND return routes. */}
              <form action={adminApplyOperatorTimetables} className="flex items-center gap-2 text-xs">
                <input type="hidden" name="operatorId" value={op.id} />
                <label className="flex items-center gap-1 text-slate-600">
                  <input type="checkbox" name="notify" defaultChecked />
                  email affected customers
                </label>
                <button type="submit" className="rounded bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-800">
                  Apply timetables
                </button>
              </form>
            </div>

            {op.routes.map((route) => (
              <div key={route.id} className="mb-4 border-t border-slate-100 pt-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {route.originPort.nameEs} → {route.destinationEs}
                  </h3>
                </div>

                <div className="space-y-3">
                  {route.timetables.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
                      <form action={adminSaveTimetable} className="flex flex-1 flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="routeId" value={route.id} />
                        <TimetableFields
                          defaults={{
                            validFrom: t.validFrom,
                            validTo: t.validTo,
                            daysMask: t.daysMask,
                            times: timesOf(t),
                          }}
                        />
                        <button type="submit" className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800">
                          Save
                        </button>
                      </form>
                      <form action={adminDeleteTimetable}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white hover:bg-red-800">
                          Delete
                        </button>
                      </form>
                    </div>
                  ))}

                  <details className="rounded-lg border border-dashed border-slate-300 p-2">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                      + Add pattern
                    </summary>
                    <form action={adminSaveTimetable} className="mt-2 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="routeId" value={route.id} />
                      <TimetableFields />
                      <button type="submit" className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800">
                        Create
                      </button>
                    </form>
                  </details>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
