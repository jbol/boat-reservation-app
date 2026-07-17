import { describe, it, expect } from "vitest";
import { adapterFor } from "./adapters";
import type { Operator } from "@prisma/client";

function operator(overrides: Partial<Operator> = {}): Operator {
  return {
    id: "op-x",
    slug: "x",
    name: "Test Ferries",
    homeUrl: "https://example.com/",
    bookingUrl: "https://example.com/book",
    blurbEs: null,
    blurbEn: null,
    tier: "deeplink",
    scheduleVerified: true,
    scheduleCheckedAt: null,
    ...overrides,
  } as Operator;
}

describe("adapterFor", () => {
  it("returns a deep-link hand-off pointing at the operator's booking URL", () => {
    const handoff = adapterFor(operator()).getHandoff(operator());
    expect(handoff.kind).toBe("deeplink");
    expect(handoff.url).toBe("https://example.com/book");
    expect(handoff.operatorName).toBe("Test Ferries");
  });

  it("falls back to the deep-link adapter for unknown tiers", () => {
    const op = operator({ tier: "some-future-tier" });
    expect(adapterFor(op).getHandoff(op).kind).toBe("deeplink");
  });
});
