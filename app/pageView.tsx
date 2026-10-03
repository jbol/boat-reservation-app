"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Sends one page-view beacon per page change; never touches the UI. */
export function PageViewBeacon() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    if (/^\/(admin|api|go)(\/|$)/.test(pathname)) return;
    const from = new URLSearchParams(window.location.search).get("from") ?? "";
    const body = JSON.stringify({ path: pathname, from, referrer: document.referrer });
    try {
      const sent = navigator.sendBeacon?.("/api/hit", new Blob([body], { type: "application/json" }));
      if (!sent) {
        fetch("/api/hit", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }).catch(() => undefined);
      }
    } catch {
      // Statistics must never affect the page.
    }
  }, [pathname]);

  return null;
}
