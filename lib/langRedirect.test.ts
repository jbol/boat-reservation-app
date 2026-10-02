import { describe, it, expect } from "vitest";
import { backPath } from "./langRedirect";

const HOSTS = ["tabarcaboats.com"];

describe("backPath", () => {
  it("returns the page the visitor came from, as a relative path", () => {
    expect(backPath("https://tabarcaboats.com/?date=2026-10-10&from=santa-pola", HOSTS)).toBe(
      "/?date=2026-10-10&from=santa-pola",
    );
    expect(backPath("https://tabarcaboats.com/horarios/kontiki", HOSTS)).toBe("/horarios/kontiki");
  });

  it("falls back to the home page without a usable referer", () => {
    expect(backPath(null, HOSTS)).toBe("/");
    expect(backPath("not a url", HOSTS)).toBe("/");
    expect(backPath("https://tabarcaboats.com/x", [])).toBe("/");
  });

  it("ignores referers from other sites", () => {
    expect(backPath("https://evil.example/phish", HOSTS)).toBe("/");
    expect(backPath("https://tabarcaboats.com.evil.example/", HOSTS)).toBe("/");
  });

  it("matches any of the site's host names, case-insensitively", () => {
    const hosts = [null, "0.0.0.0:3000", "Staging.TabarcaBoats.com"];
    expect(backPath("https://staging.tabarcaboats.com/find", hosts)).toBe("/find");
    expect(backPath("http://localhost:3000/find", [undefined, "localhost:3000"])).toBe("/find");
  });

  it("never emits a protocol-relative path", () => {
    expect(backPath("https://tabarcaboats.com//evil.example/x", HOSTS)).toBe("/");
    expect(backPath("https://tabarcaboats.com/\\evil.example", HOSTS)).not.toMatch(/^\/[\\/]/);
  });

  it("does not loop back into the language switch", () => {
    expect(backPath("https://tabarcaboats.com/lang/es", HOSTS)).toBe("/");
  });

  it("always returns something a browser resolves on the current site", () => {
    for (const referer of [
      "https://tabarcaboats.com/",
      "https://tabarcaboats.com/book/abc?x=1",
      "https://other.example/",
      null,
    ]) {
      expect(backPath(referer, HOSTS)).toMatch(/^\/(?![\\/])/);
    }
  });
});
