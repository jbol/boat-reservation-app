import { getDict } from "@/lib/i18n";
import {
  compassDir,
  describeWeather,
  getTabarcaWeather,
  isRoughSea,
} from "@/lib/weather";

/**
 * Current conditions on Tabarca. Renders nothing when data is unavailable —
 * wrap in <Suspense fallback={null}> so it streams in without blocking the
 * sailings list.
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
      {rough && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          {d.roughSeaWarning}
        </p>
      )}
    </section>
  );
}
