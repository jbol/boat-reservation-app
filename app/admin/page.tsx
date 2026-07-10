import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { adminUpdateReservation } from "@/lib/actions";
import { euros, isDateKey } from "@/lib/format";
import { AdminNav, LoginCard } from "./ui";

const badge: Record<string, string> = {
  INTENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (!(await isAdmin())) return <LoginCard error={!!sp.error} />;

  const status =
    typeof sp.status === "string" && sp.status in ReservationStatus
      ? (sp.status as ReservationStatus)
      : undefined;
  const date = isDateKey(sp.date) ? sp.date : undefined;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined;

  const where: Prisma.ReservationWhereInput = {
    ...(status ? { status } : {}),
    ...(date ? { sailing: { dateKey: date } } : {}),
    ...(q
      ? {
          OR: [
            { customer: { name: { contains: q } } },
            { customer: { email: { contains: q } } },
            { externalRef: { contains: q } },
          ],
        }
      : {}),
  };

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      customer: true,
      sailing: { include: { route: { include: { operator: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <AdminNav active="list" />

      <form method="GET" action="/admin" className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1 font-medium text-slate-700">
          Status
          <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-300 px-2 py-2">
            <option value="">All</option>
            {Object.keys(ReservationStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-medium text-slate-700">
          Sailing date
          <input type="date" name="date" defaultValue={date} className="rounded-lg border border-slate-300 px-2 py-2" />
        </label>
        <label className="flex flex-col gap-1 font-medium text-slate-700">
          Search
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="name, email or reference"
            className="rounded-lg border border-slate-300 px-2 py-2"
          />
        </label>
        <button type="submit" className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800">
          Filter
        </button>
      </form>

      <p className="mb-2 text-sm text-slate-500">{reservations.length} reservation(s)</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Sailing</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2">Est.</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Reference / actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reservations.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-3 py-3">
                  <p className="font-semibold tabular-nums">
                    {r.sailing.dateKey} · {r.sailing.departureTime}
                  </p>
                  <p className="text-slate-500">{r.sailing.route.operator.name}</p>
                  {r.sailing.status === "CANCELLED" && (
                    <p className="text-xs font-bold text-red-600">SAILING CANCELLED</p>
                  )}
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">{r.customer.name}</p>
                  <p className="text-slate-500">{r.customer.email}</p>
                  {r.customer.phone && <p className="text-slate-500">{r.customer.phone}</p>}
                </td>
                <td className="px-3 py-3 tabular-nums">
                  {r.adults}A{r.children > 0 ? ` ${r.children}C` : ""}
                  {r.infants > 0 ? ` ${r.infants}I` : ""}
                </td>
                <td className="px-3 py-3 tabular-nums">
                  {r.estTotalCents != null ? euros(r.estTotalCents, "en") : "—"}
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge[r.status]}`}>
                    {r.status}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">{r.source}</p>
                </td>
                <td className="px-3 py-3">
                  <form action={adminUpdateReservation} className="flex flex-wrap items-center gap-1">
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      type="text"
                      name="externalRef"
                      defaultValue={r.externalRef ?? ""}
                      placeholder="ref"
                      className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      name="status"
                      value="CONFIRMED"
                      className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Confirm
                    </button>
                    <button
                      name="status"
                      value="COMPLETED"
                      className="rounded bg-slate-600 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      Complete
                    </button>
                    <button
                      name="status"
                      value="CANCELLED"
                      className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white hover:bg-red-800"
                    >
                      Cancel
                    </button>
                  </form>
                  {r.notes && <p className="mt-1 text-xs text-slate-500">{r.notes}</p>}
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No reservations match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
