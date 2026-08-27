import { describe, it, expect, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

import { extractFingerprint, htmlToText } from "./scheduleWatch";

const PAGE_V1 = `
<html><head><style>.x{color:red}</style><script>track("09:99")</script></head>
<body><h1>Horarios</h1>
<p>Salidas: 9:45h, 10:45h, 12:15h y 13:15h</p>
<p>Regresos: 16:00 y 18:15</p>
<p>Precio adultos: 24 € ida y vuelta. Niños 0-4 gratis.</p>
</body></html>`;

const PAGE_V1_RESTYLED = PAGE_V1.replace("<h1>Horarios</h1>", "<h2 class='new'>¡Nuevos Horarios!</h2>")
  .replace("Salidas:", "Salidas desde Alicante:");

const PAGE_V2_TIME_CHANGE = PAGE_V1.replace("12:15h", "12:30h");
const PAGE_V2_PRICE_CHANGE = PAGE_V1.replace("24 €", "26 €");

describe("htmlToText", () => {
  it("strips scripts, styles and tags", () => {
    const text = htmlToText(PAGE_V1);
    expect(text).toContain("Salidas: 9:45h");
    expect(text).not.toContain("09:99"); // script content ignored
    expect(text).not.toContain("color:red");
  });
});

describe("extractFingerprint", () => {
  it("captures times (incl. 9:45h style) and euro prices, normalized", () => {
    const fp = extractFingerprint(PAGE_V1);
    expect(fp).toContain("09:45");
    expect(fp).toContain("13:15");
    expect(fp).toContain("16:00");
    expect(fp).toContain("€24");
  });

  it("is stable across pure layout/wording changes", () => {
    expect(extractFingerprint(PAGE_V1_RESTYLED)).toBe(extractFingerprint(PAGE_V1));
  });

  it("changes when a departure time changes", () => {
    expect(extractFingerprint(PAGE_V2_TIME_CHANGE)).not.toBe(extractFingerprint(PAGE_V1));
  });

  it("changes when a price changes", () => {
    expect(extractFingerprint(PAGE_V2_PRICE_CHANGE)).not.toBe(extractFingerprint(PAGE_V1));
  });
});
