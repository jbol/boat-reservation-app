import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDict, op } from "@/lib/i18n";
import { getSessionCustomer } from "@/lib/customerAuth";
import { customerLogin, customerLogout, customerSignup } from "@/lib/actions";
import { euros } from "@/lib/format";

const badge: Record<string, string> = {
  INTENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { locale, d } = await getDict();
  const customer = await getSessionCustomer();

  if (customer) {
    const reservations = await prisma.reservation.findMany({
      where: { customerId: customer.id },
      include: {
        sailing: { include: { route: { include: { operator: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{op(d.helloName, customer.name)}</h1>
            <p className="text-sm text-slate-500">{customer.email}</p>
          </div>
          <form action={customerLogout}>
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">
              {d.logoutBtn}
            </button>
          </form>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">{d.yourReservations}</h2>
          {reservations.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              {d.noReservationsYet}
            </p>
          ) : (
            <ul className="space-y-3">
              {reservations.map((r) => {
                const statusLabel = d[`status${r.status}` as keyof typeof d] as string;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/r/${r.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-300"
                    >
                      <span>
                        <span className="font-semibold tabular-nums">
                          {r.sailing.dateKey} · {r.sailing.departureTime}
                        </span>{" "}
                        <span className="text-slate-600">
                          — {r.sailing.route.operator.name}
                        </span>
                        {r.estTotalCents != null && (
                          <span className="text-slate-500">
                            {" "}
                            · {euros(r.estTotalCents, locale)}
                          </span>
                        )}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${badge[r.status]}`}
                      >
                        {statusLabel}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  const error = typeof sp.error === "string" ? sp.error : "";
  const errorMsg =
    error === "login"
      ? d.errLogin
      : error === "exists"
        ? d.errExists
        : error === "password"
          ? d.errPassword
          : error === "signup"
            ? d.errSignup
            : "";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">{d.accountTitle}</h1>
      <p className="text-slate-600">{d.accountIntro}</p>

      {errorMsg && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <form
          action={customerLogin}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2 className="font-semibold">{d.loginTitle}</h2>
          <label className="block text-sm font-medium text-slate-700">
            {d.emailLabel}
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {d.passwordLabel}
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800"
          >
            {d.loginBtn}
          </button>
        </form>

        <form
          action={customerSignup}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2 className="font-semibold">{d.signupTitle}</h2>
          <label className="block text-sm font-medium text-slate-700">
            {d.nameLabel}
            <input
              type="text"
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {d.emailLabel}
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {d.passwordLabel}
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              {d.passwordHint}
            </span>
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
          >
            {d.signupBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
