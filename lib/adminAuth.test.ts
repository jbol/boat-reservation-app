import { describe, it, expect, vi, beforeEach } from "vitest";

// adminAuth imports next/headers (for isAdmin); stub it for the pure-crypto tests.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import { passwordMatches, sessionToken } from "./adminAuth";

describe("passwordMatches", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "correct horse battery";
    process.env.ADMIN_COOKIE_SECRET = "test-secret";
  });

  it("accepts the exact password", () => {
    expect(passwordMatches("correct horse battery")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(passwordMatches("wrong")).toBe(false);
  });

  it("does not throw on differing lengths (timing-safe path)", () => {
    expect(() => passwordMatches("")).not.toThrow();
    expect(passwordMatches("")).toBe(false);
    expect(passwordMatches("a-much-longer-string-than-the-password")).toBe(false);
  });

  it("returns false when no admin password is configured", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(passwordMatches("anything")).toBe(false);
  });
});

describe("sessionToken", () => {
  it("is deterministic for a given secret", () => {
    process.env.ADMIN_COOKIE_SECRET = "secret-a";
    expect(sessionToken()).toBe(sessionToken());
  });

  it("changes when the secret changes", () => {
    process.env.ADMIN_COOKIE_SECRET = "secret-a";
    const a = sessionToken();
    process.env.ADMIN_COOKIE_SECRET = "secret-b";
    expect(sessionToken()).not.toBe(a);
  });
});
