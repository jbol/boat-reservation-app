import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { madridDateKey } from "./format";

/**
 * First-party usage statistics: outbound "Comprar" clicks per operator and
 * page views. Deliberately minimal and privacy-light — no cookies, no third
 * parties, no IP addresses stored — so no consent banner is needed.
 */

export const CLICK_SOURCES = ["card", "booking", "schedule", "reservation"] as const;
export type ClickSource = (typeof CLICK_SOURCES)[number];

export function clickSource(value: string | null): ClickSource | "unknown" {
  return (CLICK_SOURCES as readonly string[]).includes(value ?? "")
    ? (value as ClickSource)
    : "unknown";
}

// Crawlers, monitors and command-line fetches: forward them, don't count them.
const BOT_RE =
  /bot|crawl|spider|slurp|curl|wget|python-requests|httpclient|facebookexternalhit|whatsapp|preview|monitor|pingdom|uptime/i;

export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_RE.test(userAgent);
}

export function deviceOf(userAgent: string | null | undefined): "mobile" | "desktop" {
  return /mobi|android|iphone|ipad|ipod/i.test(userAgent ?? "") ? "mobile" : "desktop";
}

/** Pathname only, ids collapsed, so stats group by page rather than by record. */
export function normalizePath(path: string): string {
  let p = path.split("?")[0].split("#")[0] || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  p = p.replace(/^\/book\/[^/]+/, "/book/[id]").replace(/^\/r\/[^/]+/, "/r/[id]");
  return p.slice(0, 100);
}

/** Host of an off-site referrer, or null for same-site / missing / malformed. */
export function referrerHost(
  referrer: string | null | undefined,
  siteHosts: (string | null | undefined)[],
): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).host.toLowerCase();
    if (!host) return null;
    const own = siteHosts.some((h) => typeof h === "string" && h.toLowerCase() === host);
    return own ? null : host.slice(0, 100);
  } catch {
    return null;
  }
}

/**
 * Daily-salted visitor hash: the same browser hashes the same within a day
 * (so "unique visitors" works) and differently tomorrow (so days can't be
 * linked). The inputs are never stored.
 */
export function visitorHash(ip: string, userAgent: string, dateKey: string, secret: string): string {
  return createHash("sha256")
    .update(`${secret}|${dateKey}|${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 24);
}

/** Validated query-string values for the hand-off; anything odd becomes null. */
export function cleanParam(value: string | null, pattern: RegExp): string | null {
  return value && pattern.test(value) ? value : null;
}

export type Stats = {
  days: number;
  since: Date;
  views: number;
  visitors: number;
  clicks: number;
  byDay: { dateKey: string; views: number; visitors: number; clicks: number }[];
  byOperator: {
    operatorId: string;
    name: string;
    slug: string;
    clicks: number;
    bySource: Record<string, number>;
  }[];
  byPath: { path: string; views: number }[];
  byReferrer: { host: string; views: number }[];
  byDevice: Record<string, number>;
};

/** Aggregates for the admin page. Rows are small; a niche site's month fits in memory. */
export async function statsSince(db: PrismaClient, days: number): Promise<Stats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [views, clicks, operators] = await Promise.all([
    db.pageView.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, path: true, visitorHash: true, referrerHost: true, device: true },
    }),
    db.outboundClick.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, operatorId: true, source: true },
    }),
    db.operator.findMany({ select: { id: true, name: true, slug: true } }),
  ]);

  const dayMap = new Map<string, { views: number; visitors: Set<string>; clicks: number }>();
  const day = (d: Date) => {
    const key = madridDateKey(d);
    let row = dayMap.get(key);
    if (!row) {
      row = { views: 0, visitors: new Set(), clicks: 0 };
      dayMap.set(key, row);
    }
    return row;
  };
  const pathCounts = new Map<string, number>();
  const refCounts = new Map<string, number>();
  const byDevice: Record<string, number> = {};
  const visitorDays = new Set<string>();
  for (const v of views) {
    const row = day(v.createdAt);
    row.views += 1;
    row.visitors.add(v.visitorHash);
    visitorDays.add(`${madridDateKey(v.createdAt)}|${v.visitorHash}`);
    pathCounts.set(v.path, (pathCounts.get(v.path) ?? 0) + 1);
    if (v.referrerHost) refCounts.set(v.referrerHost, (refCounts.get(v.referrerHost) ?? 0) + 1);
    byDevice[v.device] = (byDevice[v.device] ?? 0) + 1;
  }
  const opCounts = new Map<string, { clicks: number; bySource: Record<string, number> }>();
  for (const c of clicks) {
    day(c.createdAt).clicks += 1;
    let row = opCounts.get(c.operatorId);
    if (!row) {
      row = { clicks: 0, bySource: {} };
      opCounts.set(c.operatorId, row);
    }
    row.clicks += 1;
    row.bySource[c.source] = (row.bySource[c.source] ?? 0) + 1;
  }

  return {
    days,
    since,
    views: views.length,
    visitors: visitorDays.size,
    clicks: clicks.length,
    byDay: [...dayMap.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([dateKey, r]) => ({ dateKey, views: r.views, visitors: r.visitors.size, clicks: r.clicks })),
    byOperator: operators
      .map((o) => ({
        operatorId: o.id,
        name: o.name,
        slug: o.slug,
        clicks: opCounts.get(o.id)?.clicks ?? 0,
        bySource: opCounts.get(o.id)?.bySource ?? {},
      }))
      .sort((a, b) => b.clicks - a.clicks),
    byPath: [...pathCounts.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 12),
    byReferrer: [...refCounts.entries()]
      .map(([host, views]) => ({ host, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10),
    byDevice,
  };
}
