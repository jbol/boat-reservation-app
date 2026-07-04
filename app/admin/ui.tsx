import Link from "next/link";
import { adminLogin, adminLogout } from "@/lib/actions";

export function LoginCard({ error }: { error?: boolean }) {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold">Admin</h1>
      <p className="mt-1 text-sm text-slate-600">
        Enter the admin password to manage reservations.
      </p>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          Wrong password.
        </p>
      )}
      <form action={adminLogin} className="mt-4 space-y-3">
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="Password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800"
        >
          Log in
        </button>
      </form>
    </div>
  );
}

export function AdminNav({ active }: { active: "list" | "new" }) {
  const base = "rounded-lg px-3 py-2 text-sm font-semibold";
  return (
    <div className="mb-6 flex items-center gap-2">
      <Link
        href="/admin"
        className={`${base} ${active === "list" ? "bg-sky-700 text-white" : "border border-slate-300 hover:bg-slate-100"}`}
      >
        Reservations
      </Link>
      <Link
        href="/admin/new"
        className={`${base} ${active === "new" ? "bg-sky-700 text-white" : "border border-slate-300 hover:bg-slate-100"}`}
      >
        + Manual entry
      </Link>
      <form action={adminLogout} className="ml-auto">
        <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">
          Log out
        </button>
      </form>
    </div>
  );
}
