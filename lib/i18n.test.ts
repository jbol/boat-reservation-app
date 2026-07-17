import { describe, it, expect, vi } from "vitest";

// i18n imports next/headers at module load (for getLocale); stub it so the
// import resolves in a plain Node test environment.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import { dictionaries, op } from "./i18n";

describe("dictionaries", () => {
  it("has identical keys in Spanish and English (no missing translations)", () => {
    const esKeys = Object.keys(dictionaries.es).sort();
    const enKeys = Object.keys(dictionaries.en).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it("has no empty strings", () => {
    for (const [locale, dict] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value, `${locale}.${key} should not be empty`).not.toBe("");
      }
    }
  });
});

describe("op", () => {
  it("substitutes the operator name for every {op} placeholder", () => {
    expect(op("Comprar en {op} — {op}", "Kontiki")).toBe("Comprar en Kontiki — Kontiki");
  });

  it("leaves strings without a placeholder untouched", () => {
    expect(op("Sin marcador", "Kontiki")).toBe("Sin marcador");
  });
});
