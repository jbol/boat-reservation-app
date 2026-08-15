import type { Locale } from "./i18n";

/**
 * Current conditions for Isla de Tabarca from Open-Meteo (no API key; data
 * CC BY 4.0, attribution shown in the widget). Marine data adds wave height —
 * the thing that actually cancels Tabarca crossings. Everything degrades
 * gracefully: any failure yields null and the widget simply doesn't render.
 */

const LAT = 38.166;
const LON = -0.478;
const REVALIDATE_SECONDS = 1800;
const FETCH_TIMEOUT_MS = 4000;

export type TabarcaWeather = {
  tempC: number;
  feelsC: number;
  code: number;
  windKmh: number;
  gustKmh: number;
  windDirDeg: number;
  waveM: number | null;
  wavePeriodS: number | null;
};

export function parseWeather(forecast: unknown, marine: unknown): TabarcaWeather | null {
  const f = (forecast as { current?: Record<string, unknown> } | null)?.current;
  if (!f || typeof f.temperature_2m !== "number") return null;
  const m = (marine as { current?: Record<string, unknown> } | null)?.current;
  const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);
  return {
    tempC: f.temperature_2m,
    feelsC: num(f.apparent_temperature, f.temperature_2m),
    code: num(f.weather_code, 0),
    windKmh: num(f.wind_speed_10m, 0),
    gustKmh: num(f.wind_gusts_10m, 0),
    windDirDeg: num(f.wind_direction_10m, 0),
    waveM: typeof m?.wave_height === "number" ? m.wave_height : null,
    wavePeriodS: typeof m?.wave_period === "number" ? m.wave_period : null,
  };
}

/** WMO weather code → icon + localized label. */
export function describeWeather(code: number, locale: Locale): { icon: string; label: string } {
  const es = locale === "es";
  if (code === 0) return { icon: "☀️", label: es ? "despejado" : "clear" };
  if (code === 1) return { icon: "🌤️", label: es ? "mayormente despejado" : "mostly clear" };
  if (code === 2) return { icon: "⛅", label: es ? "parcialmente nublado" : "partly cloudy" };
  if (code === 3) return { icon: "☁️", label: es ? "nublado" : "overcast" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: es ? "niebla" : "fog" };
  if (code >= 51 && code <= 57) return { icon: "🌦️", label: es ? "llovizna" : "drizzle" };
  if (code >= 61 && code <= 67) return { icon: "🌧️", label: es ? "lluvia" : "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { icon: "❄️", label: es ? "nieve" : "snow" };
  if (code >= 80 && code <= 82) return { icon: "🌦️", label: es ? "chubascos" : "showers" };
  if (code >= 95) return { icon: "⛈️", label: es ? "tormenta" : "storm" };
  return { icon: "☁️", label: es ? "nubes" : "clouds" };
}

/** Degrees → 8-point compass, localized (Spanish uses O for oeste). */
export function compassDir(deg: number, locale: Locale): string {
  const points =
    locale === "es"
      ? ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
      : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export const ROUGH_GUST_KMH = 40;
export const ROUGH_WAVE_M = 1.2;

/** Heads-up threshold: conditions under which operators often cancel. */
export function isRoughSea(w: TabarcaWeather): boolean {
  return w.gustKmh >= ROUGH_GUST_KMH || (w.waveM !== null && w.waveM >= ROUGH_WAVE_M);
}

export async function getTabarcaWeather(): Promise<TabarcaWeather | null> {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m` +
    `&timezone=Europe%2FMadrid`;
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}` +
    `&current=wave_height,wave_period&timezone=Europe%2FMadrid`;

  try {
    const [forecast, marine] = await Promise.all(
      [forecastUrl, marineUrl].map((url) =>
        fetch(url, {
          next: { revalidate: REVALIDATE_SECONDS },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    );
    return parseWeather(forecast, marine);
  } catch {
    return null;
  }
}
