"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { nearestPort, type NearestPort } from "@/lib/geo";

// This session's detection result: JSON NearestPort, or "none" (too far,
// declined, unavailable). Its presence also means "don't auto-detect again".
const SESSION_KEY = "tb-geo";
// Timestamp of a declined/failed attempt, so new sessions don't re-prompt.
const DECLINED_KEY = "tb-geo-declined";
const DECLINED_QUIET_MS = 30 * 24 * 60 * 60 * 1000;
const CHANGE_EVENT = "tb-geo-change";

function readSession(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(value: string) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, value);
  } catch {
    // Storage unavailable (private mode): detection simply isn't remembered.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function recentlyDeclined(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DECLINED_KEY));
    return at > 0 && Date.now() - at < DECLINED_QUIET_MS;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/**
 * Picks the "Desde" port from the visitor's position: automatically once per
 * session (unless a port is already in the URL), and on demand via the 📍
 * button. The position is used only in the browser to choose a port slug.
 */
export function LocationPort({
  dateKey,
  from,
  fromInUrl,
  locale,
  portNames,
  labels,
}: {
  dateKey: string;
  /** Port filter currently applied ("" = all ports). */
  from: string;
  /** True when the URL carries a `from` param, i.e. someone already chose. */
  fromInUrl: boolean;
  locale: "es" | "en";
  portNames: Record<string, string>;
  labels: { use: string; near: string; island: string; showAll: string };
}) {
  const router = useRouter();
  const stored = useSyncExternalStore(subscribe, readSession, () => null);
  const autoRan = useRef(false);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const hit = nearestPort(position.coords.latitude, position.coords.longitude);
        writeSession(hit ? JSON.stringify(hit) : "none");
        if (hit && hit.slug !== from) {
          router.replace(`/?date=${dateKey}&from=${hit.slug}`, { scroll: false });
        }
      },
      () => {
        writeSession("none");
        try {
          window.localStorage.setItem(DECLINED_KEY, String(Date.now()));
        } catch {
          // Not remembered; the worst case is one more prompt next session.
        }
      },
      { maximumAge: 10 * 60 * 1000, timeout: 10_000 },
    );
  }, [dateKey, from, router]);

  useEffect(() => {
    if (autoRan.current || fromInUrl) return;
    autoRan.current = true;
    if (readSession() === null && !recentlyDeclined()) locate();
  }, [fromInUrl, locate]);

  let hit: NearestPort | null = null;
  if (stored && stored !== "none") {
    try {
      hit = JSON.parse(stored) as NearestPort;
    } catch {
      hit = null;
    }
  }
  const km = hit
    ? new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {
        maximumFractionDigits: 1,
      }).format(hit.km)
    : "";

  return (
    <>
      <button
        type="button"
        onClick={locate}
        title={labels.use}
        aria-label={labels.use}
        className="rounded-lg border border-slate-300 px-3 py-2 text-base hover:bg-slate-100"
      >
        📍
      </button>
      {hit && hit.slug === from && (
        <p
          role="status"
          className="order-last basis-full rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900"
        >
          📍{" "}
          {hit.slug === "tabarca"
            ? labels.island
            : labels.near.replace("{port}", portNames[hit.slug] ?? hit.slug).replace("{km}", km)}{" "}
          <Link href={`/?date=${dateKey}&from=`} className="font-semibold underline">
            {labels.showAll}
          </Link>
        </p>
      )}
    </>
  );
}
