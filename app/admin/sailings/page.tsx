import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { adminSetSailingStatus } from "@/lib/actions";
import { isDateKey, madridTodayKey } from "@/lib/format";
import { AdminNav, LoginCard } from "../ui";

export default async function AdminSailingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (!(await isAdmin())) return <LoginCard />;

  const date = isDateKey(sp.date) ? sp.date : madridTodayKey();
  const sailings = await prisma.sailing.findMany({
    where: { dateKey: date },
    include: {
      route: { include: { operator: true, originPort: true } },
      _count: {
        select: {
          reservations: { where: { status: { in: ["INTENT", "CONFIRMED"] } } },
        },
      },
    },
    orderBy: { departureTime: "asc" },
  });

  return (
    <div>
      <AdminNav active="sailings" />

      <h1 className="mb-1 text-xl font-bold">Sailings</h1>
      <p className="mb-4 text-sm text-slate-600">
        Cancel a sailing when the operator calls it off (sea conditions, etc.). Active
        reservations on it can be notified by email automatically.
      </p>

      <form method="GET" action="/admin/sailings" className="mb-4 flex items-end gap-2 text-sm">
        <label className="flex flex-col gap-1 font-medium text-slate-700">
          Date
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800"
        >
          Show
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Departure</th>
              <th className="px-3 py-2">Operator</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Active reservations</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sailings.map((s) => (
              <tr key={s.id} className="align-middle">
                <td className="px-3 py-3 font-semibold tabular-nums">
                  {s.dateKey} · {s.departureTime}
                </td>
                <td className="px-3 py-3">
                  {s.route.operator.name}
                  <span className="text-slate-500"> ({s.route.originPort.nameEs})</span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      s.status === "SCHEDULED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {s._count.reservations > 0 ? (
                    <Link
                      href={`/admin?date=${s.dateKey}`}
                      className="font-semibold text-sky-700 hover:text-sky-900"
                    >
                      {s._count.reservations}
                    </Link>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <form
                    action={adminSetSailingStatus}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    {s.status === "SCHEDULED" ? (
                      <>
                        <label className="flex items-center gap-1 text-xs text-slate-600">
                          <input type="checkbox" name="notify" defaultChecked />
                          email affected customers
                        </label>
                        <button
                          name="status"
                          value="CANCELLED"
                          className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white hover:bg-red-800"
                        >
                          Cancel sailing
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          name="status"
                          value="SCHEDULED"
                          className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          Restore
                        </button>
                        <span className="text-xs text-slate-400">restoring does not notify</span>
                      </>
                    )}
                  </form>
                </td>
              </tr>
            ))}
            {sailings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  No sailings on {date}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
