import { describe, it, expect, beforeEach } from "vitest";
import { isRateLimited, recordFailure, resetRateLimits } from "./rateLimit";

const T0 = 1_000_000_000;
const MIN = 60 * 1000;

beforeEach(() => resetRateLimits());

describe("rate limiter", () => {
  it("allows attempts below the limit", () => {
    for (let i = 0; i < 4; i++) recordFailure("k", T0 + i);
    expect(isRateLimited("k", 5, 15 * MIN, T0 + 10)).toBe(false);
  });

  it("blocks once the limit is reached", () => {
    for (let i = 0; i < 5; i++) recordFailure("k", T0 + i);
    expect(isRateLimited("k", 5, 15 * MIN, T0 + 10)).toBe(true);
  });

  it("checking never consumes quota", () => {
    for (let i = 0; i < 4; i++) recordFailure("k", T0 + i);
    for (let i = 0; i < 20; i++) {
      expect(isRateLimited("k", 5, 15 * MIN, T0 + 10)).toBe(false);
    }
  });

  it("old failures slide out of the window", () => {
    for (let i = 0; i < 5; i++) recordFailure("k", T0 + i);
    expect(isRateLimited("k", 5, 15 * MIN, T0 + 10)).toBe(true);
    expect(isRateLimited("k", 5, 15 * MIN, T0 + 16 * MIN)).toBe(false);
  });

  it("keys are independent", () => {
    for (let i = 0; i < 5; i++) recordFailure("a", T0 + i);
    expect(isRateLimited("a", 5, 15 * MIN, T0 + 10)).toBe(true);
    expect(isRateLimited("b", 5, 15 * MIN, T0 + 10)).toBe(false);
  });
});
