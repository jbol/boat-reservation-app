import { getDict } from "@/lib/i18n";
import { requestReservationLinks } from "@/lib/actions";

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { d } = await getDict();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">{d.findTitle}</h1>
      <p className="text-slate-600">{d.findIntro}</p>

      {sp.sent && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {d.findSent}
        </p>
      )}

      <form
        action={requestReservationLinks}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="block text-sm font-medium text-slate-700">
          {d.emailLabel}
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800"
        >
          {d.findSubmit}
        </button>
      </form>
    </div>
  );
}
