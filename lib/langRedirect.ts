/**
 * Where to send the visitor after a language switch: the page they came
 * from, as a site-relative path. Never an absolute URL — behind the hosting
 * proxy the server's own idea of its address is the internal bind address
 * (0.0.0.0:3000), so anything built from it sends people nowhere.
 *
 * `siteHosts` are the host names this site answers on (forwarded host, Host
 * header, configured public host); a referer from anywhere else is ignored.
 */
export function backPath(referer: string | null, siteHosts: (string | null | undefined)[]): string {
  if (!referer) return "/";
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return "/";
  }
  const host = url.host.toLowerCase();
  const sameSite = siteHosts.some((h) => typeof h === "string" && h.toLowerCase() === host);
  if (!sameSite) return "/";
  // Don't bounce back into the language switch itself.
  if (url.pathname.startsWith("/lang/")) return "/";
  const path = url.pathname + url.search;
  // "//host/…" and "/\host" are protocol-relative to a browser: never emit them.
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/";
  return path;
}
