/**
 * Each operator's boats/booths have a recognisable colour; the cards carry it
 * as an outline so a customer can match the card to the boat on the quay.
 * Keyed by operator slug; unknown operators fall back to a neutral border.
 */
export const BRAND_COLORS: Record<string, string> = {
  transtabarca: "#11395f", // navy (blue booths, navy site)
  kontiki: "#d32f2f", // the red boat
  tabarkeras: "#ff6600", // the orange boats
  "viajes-isla-tabarca": "#e8603a", // coral orange (Nueva Tabarca)
  "maritimas-torrevieja": "#e8ab14", // gold (Marítimas logo)
};

export const NEUTRAL_BORDER = "#e2e8f0"; // slate-200

export function brandColor(slug: string): string {
  return BRAND_COLORS[slug] ?? NEUTRAL_BORDER;
}
