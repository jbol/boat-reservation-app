import { describe, it, expect } from "vitest";
import {
  cleanParam,
  clickSource,
  deviceOf,
  isBot,
  normalizePath,
  referrerHost,
  visitorHash,
} from "./analytics";

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("isBot", () => {
  it("forwards but never counts crawlers, monitors and command-line fetches", () => {
    for (const ua of ["curl/8.4.0", "Googlebot/2.1 (+http://www.google.com/bot.html)", "UptimeRobot/2.0", null, ""]) {
      expect(isBot(ua), String(ua)).toBe(true);
    }
  });
  it("counts real browsers", () => {
    expect(isBot(CHROME)).toBe(false);
    expect(isBot(IPHONE)).toBe(false);
  });
});

describe("deviceOf", () => {
  it("splits phones from desktops", () => {
    expect(deviceOf(IPHONE)).toBe("mobile");
    expect(deviceOf(CHROME)).toBe("desktop");
    expect(deviceOf(null)).toBe("desktop");
  });
});

describe("normalizePath", () => {
  it("keeps the page, drops the record id, query and trailing slash", () => {
    expect(normalizePath("/book/cmr6hu370013np9svefj9ha6x?x=1")).toBe("/book/[id]");
    expect(normalizePath("/r/abc123#top")).toBe("/r/[id]");
    expect(normalizePath("/horarios/kontiki/")).toBe("/horarios/kontiki");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("/" + "x".repeat(500))).toHaveLength(100);
  });
});

describe("referrerHost", () => {
  it("records off-site hosts only", () => {
    expect(referrerHost("https://www.google.com/search?q=tabarca", ["tabarcaboats.com"])).toBe("www.google.com");
    expect(referrerHost("https://tabarcaboats.com/?date=2026-10-10", ["tabarcaboats.com"])).toBeNull();
    expect(referrerHost("", ["tabarcaboats.com"])).toBeNull();
    expect(referrerHost("not a url", ["tabarcaboats.com"])).toBeNull();
  });
});

describe("visitorHash", () => {
  it("is stable within a day, different across days, and never contains the inputs", () => {
    const a = visitorHash("203.0.113.9", CHROME, "2026-10-03", "s3cret");
    expect(visitorHash("203.0.113.9", CHROME, "2026-10-03", "s3cret")).toBe(a);
    expect(visitorHash("203.0.113.9", CHROME, "2026-10-04", "s3cret")).not.toBe(a);
    expect(visitorHash("203.0.113.10", CHROME, "2026-10-03", "s3cret")).not.toBe(a);
    expect(a).toHaveLength(24);
    expect(a).not.toContain("203");
  });
});

describe("param validation", () => {
  it("accepts known click sources and rejects the rest", () => {
    expect(clickSource("card")).toBe("card");
    expect(clickSource("booking")).toBe("booking");
    expect(clickSource("<script>")).toBe("unknown");
    expect(clickSource(null)).toBe("unknown");
  });
  it("cleans query values against a pattern", () => {
    expect(cleanParam("2026-10-10", /^\d{4}-\d{2}-\d{2}$/)).toBe("2026-10-10");
    expect(cleanParam("tomorrow", /^\d{4}-\d{2}-\d{2}$/)).toBeNull();
    expect(cleanParam(null, /^\d{4}-\d{2}-\d{2}$/)).toBeNull();
  });
});
