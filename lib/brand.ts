/**
 * Each operator's boats/booths have a recognisable colour; the cards carry it
 * (outline, header band, buy button) so a customer can match the card to the
 * boat on the quay. Keyed by operator slug; unknown operators stay neutral.
 */
export const BRAND_COLORS: Record<string, string> = {
  transtabarca: "#11395f", // navy (blue booths, navy site)
  kontiki: "#d32f2f", // the red boat
  tabarkeras: "#ff6600", // the orange boats
  "viajes-isla-tabarca": "#e8603a", // coral orange (Nueva Tabarca)
  "maritimas-torrevieja": "#e8ab14", // gold (Marítimas logo)
};

export const NEUTRAL_BORDER = "#e2e8f0"; // slate-200

const WHITE = "#ffffff";
const INK = "#0f172a"; // slate-900, the site's body text

export function brandColor(slug: string): string {
  return BRAND_COLORS[slug] ?? NEUTRAL_BORDER;
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two #rrggbb colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Lettering for text on a filled colour: white or ink, whichever reads better. */
export function onColor(fill: string): string {
  return contrastRatio(fill, WHITE) >= contrastRatio(fill, INK) ? WHITE : INK;
}

/** Fill + lettering for an operator's header band and buy button. */
export function brandOf(slug: string): { color: string; on: string } {
  const color = brandColor(slug);
  return { color, on: onColor(color) };
}
