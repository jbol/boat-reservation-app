import type { Locale } from "./i18n";

export function euros(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Today's date key ("YYYY-MM-DD") in the boats' timezone, Europe/Madrid. */
export function madridTodayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
}

/** Current time "HH:MM" in Europe/Madrid — for dimming already-departed boats. */
export function madridNowTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateKey(dateKey: string, locale: Locale): string {
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString(
    locale === "es" ? "es-ES" : "en-GB",
    { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" },
  );
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** "4 jul" / "Jul 4" — compact date for timetable validity ranges. */
export function formatDateKeyShort(dateKey: string, locale: Locale): string {
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString(
    locale === "es" ? "es-ES" : "en-GB",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );
}

export const SCHEDULE_STALE_DAYS = 14;

/** Whole days from `fromKey` to `toKey` (negative when toKey is earlier). */
export function dateKeyDiffDays(fromKey: string, toKey: string): number {
  const ms = Date.parse(`${toKey}T12:00:00Z`) - Date.parse(`${fromKey}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export const HORIZON_WARN_DAYS = 21;

export type HorizonStatus = "ok" | "near" | "past";

/** How close `todayKey` is to the last date with loaded schedule data.
 *  "past" = no data for today onward, "near" = HORIZON_WARN_DAYS or fewer
 *  days of data left (today counts as day 0). */
export function horizonStatus(
  dataUntil: string | null | undefined,
  todayKey: string,
): HorizonStatus {
  if (!dataUntil || dataUntil < todayKey) return "past";
  return dateKeyDiffDays(todayKey, dataUntil) <= HORIZON_WARN_DAYS ? "near" : "ok";
}

/** True when a schedule verification is missing or older than the threshold. */
export function isScheduleStale(checkedAt: Date | null | undefined): boolean {
  if (!checkedAt) return true;
  return Date.now() - checkedAt.getTime() > SCHEDULE_STALE_DAYS * 24 * 60 * 60 * 1000;
}

const DAY_ABBREV: Record<Locale, string[]> = {
  es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

/** Human-readable weekday list from a Sunday-first "1010101" mask,
 *  displayed Monday-first. Returns "" for an all-zero mask. */
export function formatDaysMask(mask: string, locale: Locale): string {
  if (mask === "1111111") return locale === "es" ? "todos los días" : "every day";
  const names = DAY_ABBREV[locale];
  const mondayFirst = [1, 2, 3, 4, 5, 6, 0];
  return mondayFirst
    .filter((i) => mask[i] === "1")
    .map((i) => names[i])
    .join(", ");
}
