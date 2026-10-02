/**
 * Nearest-port detection for the "Desde" filter. Pure maths, run in the
 * visitor's browser: coordinates never leave the device.
 */

/** Departure quays, keyed by port slug. */
export const PORT_COORDS: Record<string, { lat: number; lon: number }> = {
  "santa-pola": { lat: 38.1897, lon: -0.5565 },
  alicante: { lat: 38.3405, lon: -0.484 },
  torrevieja: { lat: 37.9745, lon: -0.683 },
};

/** Centre of Isla de Tabarca; inside the radius you are standing on the island. */
export const TABARCA_CENTRE = { lat: 38.1652, lon: -0.4775 };
export const ISLAND_RADIUS_KM = 1.6;
/** Farther than this from every quay, don't guess a departure port. */
export const PORT_RADIUS_KM = 50;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle (haversine) distance in kilometres. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export type NearestPort = { slug: string; km: number };

/**
 * The port filter that fits a position: "tabarca" when on the island (show
 * the return boats), the nearest mainland quay when within range, or null
 * when the visitor is too far away for a sensible guess.
 */
export function nearestPort(lat: number, lon: number): NearestPort | null {
  const round = (km: number) => Math.round(km * 10) / 10;
  const island = distanceKm(lat, lon, TABARCA_CENTRE.lat, TABARCA_CENTRE.lon);
  if (island <= ISLAND_RADIUS_KM) return { slug: "tabarca", km: round(island) };

  let best: NearestPort | null = null;
  for (const [slug, quay] of Object.entries(PORT_COORDS)) {
    const km = distanceKm(lat, lon, quay.lat, quay.lon);
    if (!best || km < best.km) best = { slug, km };
  }
  return best && best.km <= PORT_RADIUS_KM ? { slug: best.slug, km: round(best.km) } : null;
}
