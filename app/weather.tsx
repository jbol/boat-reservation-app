import { getDict } from "@/lib/i18n";
import {
  compassDir,
  describeWeather,
  getTabarcaWeather,
  isRoughConditions,
  isRoughSea,
} from "@/lib/weather";

/**
 * Skeleton with the same footprint as the loaded widget (summary row +
 * hourly strip), so streaming the real data in causes no layout shift.
 * Use as the Suspense fallback wherever the widget renders.
 */
export function WeatherSkeleton() {
  return (
    <section
      className="animate-pulse rounded-xl border border-slate-200 bg-white p-4"
      aria-hidden
    >
      <div className="flex items-center gap-4">
        <div className="h-7 w-7 rounded-full bg-slate-100" />
        <div className="h-5 w-40 rounded bg-slate-100" />
        <div className="h-5 w-32 rounded bg-slate-100" />
      </div>
      <div className="mt-3 flex gap-1 overflow-hidden pb-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-[74px] min-w-12 flex-shrink-0 rounded-lg bg-slate-50" />
        ))}
      </div>
    </section>
  );
}

/**
 * Current conditions on Tabarca. Renders nothing when data is unavailable —
 * wrap in <Suspense fallback={<WeatherSkeleton />}> so it streams in without
 * blocking the sailings list or shifting the layout.
 */
export async function TabarcaWeatherWidget() {
  const [{ locale, d }, weather] = await Promise.all([getDict(), getTabarcaWeather()]);
  if (!weather) return null;

  const { icon, label } = describeWeather(weather.code, locale);
  const rough = isRoughSea(weather);
  const fmt = (n: number, digits = 0) =>
    n.toLocaleString(locale === "es" ? "es-ES" : "en-GB", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <span>
          <strong className="text-lg text-slate-900">{fmt(weather.tempC)}°C</strong>{" "}
          <span className="text-slate-500">
            ({d.feelsLike} {fmt(weather.feelsC)}°C)
          </span>{" "}
          · {label}
        </span>
        <span>
          {d.wind} {compassDir(weather.windDirDeg, locale)} {fmt(weather.windKmh)} km/h
          <span className="text-slate-500">
            {" "}
            ({d.gusts} {fmt(weather.gustKmh)})
          </span>
        </span>
        {weather.waveM !== null && (
          <span>
            {d.waves} {fmt(weather.waveM, 1)} m
          </span>
        )}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-slate-400 hover:text-slate-600"
        >
          Open-Meteo
        </a>
      </div>
      {weather.hours.length > 0 && (
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {weather.hours.map((h) => {
            const hourRough = isRoughConditions(h.gustKmh, h.waveM);
            const { icon: hourIcon } = describeWeather(h.code, locale);
            return (
              <div
                key={h.time}
                title={hourRough ? d.roughSeaWarning : undefined}
                className={`flex min-w-12 flex-shrink-0 flex-col items-center rounded-lg px-1 py-1.5 text-xs ${
                  hourRough ? "bg-amber-100" : "bg-slate-50"
                }`}
              >
                <span className="text-slate-500">{h.time}</span>
                <span className="text-base" aria-hidden>
                  {hourIcon}
                </span>
                <span className="font-semibold text-slate-800">{fmt(h.tempC)}°</span>
                <span className="text-[10px] text-slate-500">{fmt(h.gustKmh)} km/h</span>
              </div>
            );
          })}
        </div>
      )}
      {rough && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          {d.roughSeaWarning}
        </p>
      )}
    </section>
  );
}
