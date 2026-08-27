import { prisma } from "./prisma";

/**
 * Daily schedule-drift tripwire. Fetches each operator's schedule page,
 * reduces it to a fingerprint (every departure-time and euro-price token on
 * the page), and records when that fingerprint changes. It deliberately does
 * NOT try to parse timetables — a changed fingerprint is a signal for a real
 * verification pass (LLM agents / human), surfaced in Admin → Timetables.
 */

export const WATCH_SOURCES: { id: string; operatorId: string; url: string }[] = [
  {
    id: "kontiki-horarios",
    operatorId: "op-kontiki",
    url: "https://cruceroskontiki.com/horarios-y-precios/",
  },
  {
    id: "transtabarca-barco",
    operatorId: "op-transtabarca",
    url: "https://www.islatabarca.com/barco-a-tabarca/",
  },
  {
    id: "maritimas-horarios",
    operatorId: "op-maritimas-torrevieja",
    url: "https://maritimastorrevieja.es/precios-y-horarios/",
  },
];

/** Visible text of an HTML document, scripts/styles stripped. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Fingerprint = the sorted, deduplicated set of time tokens (H:MM / HH:MM,
 * also accepting the "9:45h" style Spanish sites use) and euro prices found
 * in the page text. Layout/wording churn doesn't change it; a schedule or
 * price change does.
 */
export function extractFingerprint(html: string): string {
  const text = htmlToText(html);
  const times = [...text.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*h?\b/g)].map(
    (m) => `${m[1].padStart(2, "0")}:${m[2]}`,
  );
  const prices = [...text.matchAll(/(\d+(?:[.,]\d{1,2})?)\s*€|€\s*(\d+(?:[.,]\d{1,2})?)/g)].map(
    (m) => `€${(m[1] ?? m[2]).replace(",", ".")}`,
  );
  return [...new Set([...times, ...prices])].sort().join(" ");
}

export type WatchResult = {
  id: string;
  operatorId: string;
  status: "unchanged" | "changed" | "first-fetch" | "fetch-failed";
};

/** Fetch every watched page, compare fingerprints, persist. Never throws. */
export async function runScheduleWatch(): Promise<WatchResult[]> {
  const results: WatchResult[] = [];
  for (const source of WATCH_SOURCES) {
    try {
      const response = await fetch(source.url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "tabarcaboats.com schedule-watch (contact: admin)" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const fingerprint = extractFingerprint(await response.text());
      const now = new Date();

      const previous = await prisma.scheduleSnapshot.findUnique({ where: { id: source.id } });
      const changed = previous !== null && previous.fingerprint !== fingerprint;
      await prisma.scheduleSnapshot.upsert({
        where: { id: source.id },
        update: { fingerprint, fetchedAt: now, ...(changed ? { lastChangedAt: now } : {}) },
        create: {
          id: source.id,
          operatorId: source.operatorId,
          url: source.url,
          fingerprint,
          fetchedAt: now,
        },
      });
      results.push({
        id: source.id,
        operatorId: source.operatorId,
        status: previous === null ? "first-fetch" : changed ? "changed" : "unchanged",
      });
    } catch {
      results.push({ id: source.id, operatorId: source.operatorId, status: "fetch-failed" });
    }
  }
  return results;
}

/** Operators whose watched page changed after their last verification. */
export async function driftFlags(): Promise<
  { operatorId: string; url: string; lastChangedAt: Date }[]
> {
  const snapshots = await prisma.scheduleSnapshot.findMany({
    where: { lastChangedAt: { not: null } },
  });
  if (snapshots.length === 0) return [];
  const operators = await prisma.operator.findMany({
    where: { id: { in: snapshots.map((s) => s.operatorId) } },
    select: { id: true, scheduleCheckedAt: true },
  });
  const checkedAt = new Map(operators.map((o) => [o.id, o.scheduleCheckedAt]));
  return snapshots
    .filter((s) => {
      const verified = checkedAt.get(s.operatorId);
      return !verified || (s.lastChangedAt && s.lastChangedAt > verified);
    })
    .map((s) => ({ operatorId: s.operatorId, url: s.url, lastChangedAt: s.lastChangedAt! }));
}
