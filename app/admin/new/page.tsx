import { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { adminCreateReservation } from "@/lib/actions";
import { isDateKey, madridTodayKey } from "@/lib/format";
import { AdminNav, LoginCard } from "../ui";

export default async function AdminNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (!(await isAdmin())) return <LoginCard />;

  const date = isDateKey(sp.date) ? sp.date : madridTodayKey();
  const sailings = await prisma.sailing.findMany({
    where: { dateKey: date, status: "SCHEDULED" },
    include: { route: { include: { operator: true, originPort: true } } },
    orderBy: { departureTime: "asc" },
  });

  return (
    <div>
      <AdminNav active="new" />
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-xl font-bold">Manual reservation</h1>
        <p className="text-sm text-slate-600">
          For bookings taken by phone, email or at the counter — recorded directly, no hand-off.
        </p>

        {sp.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Check the form: sailing, name, email and at least one passenger are required.
          </p>
        )}

        <form method="GET" action="/admin/new" className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <label className="flex flex-col gap-1 font-medium text-slate-700">
            Sailing date
            <input type="date" name="date" defaultValue={date} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-100">
            Load sailings
          </button>
        </form>

        <form action={adminCreateReservation} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <label className="block font-medium text-slate-700">
            Sailing
            <select name="sailingId" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              {sailings.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.dateKey} {s.departureTime} — {s.route.operator.name} ({s.route.originPort.nameEs})
                </option>
              ))}
            </select>
          </label>
          {sailings.length === 0 && (
            <p className="text-slate-500">No sailings on {date} — pick another date above.</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <label className="block font-medium text-slate-700">
              Adults
              <input type="number" name="count_adult" min={0} max={50} defaultValue={1} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block font-medium text-slate-700">
              Children
              <input type="number" name="count_child" min={0} max={50} defaultValue={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block font-medium text-slate-700">
              Infants
              <input type="number" name="count_infant" min={0} max={50} defaultValue={0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          </div>

          <label className="block font-medium text-slate-700">
            Customer name
            <input type="text" name="name" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block font-medium text-slate-700">
            Email
            <input type="email" name="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block font-medium text-slate-700">
            Phone
            <input type="tel" name="phone" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block font-medium text-slate-700">
              Status
              <select name="status" defaultValue="CONFIRMED" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                {Object.keys(ReservationStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block font-medium text-slate-700">
              Operator reference
              <input type="text" name="externalRef" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          </div>

          <label className="block font-medium text-slate-700">
            Notes
            <textarea name="notes" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <button
            type="submit"
            disabled={sailings.length === 0}
            className="w-full rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Save reservation
          </button>
        </form>
      </div>
    </div>
  );
}
