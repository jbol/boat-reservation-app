import { describe, it, expect, beforeEach, vi } from "vitest";

// customerAuth imports next/headers (getSessionCustomer) and the Prisma
// client; stub both — these tests cover the pure crypto core.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("./prisma", () => ({ prisma: {} }));

import {
  hashPassword,
  verifyPassword,
  customerSessionToken,
  makeSessionCookieValue,
} from "./customerAuth";
import { sessionToken as adminSessionToken } from "./adminAuth";

beforeEach(() => {
  process.env.ADMIN_COOKIE_SECRET = "test-secret";
});

describe("hashPassword / verifyPassword", () => {
  it("round-trips a correct password", () => {
    const stored = hashPassword("correct horse battery");
    expect(verifyPassword("correct horse battery", stored)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const stored = hashPassword("correct horse battery");
    expect(verifyPassword("wrong horse", stored)).toBe(false);
  });

  it("salts: same password hashes differently each time", () => {
    expect(hashPassword("samepass")).not.toBe(hashPassword("samepass"));
  });

  it("rejects malformed stored values without throwing", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "plaintext")).toBe(false);
    expect(verifyPassword("x", "bcrypt$abc$def")).toBe(false);
  });
});

describe("customer session tokens", () => {
  it("is deterministic per customer and secret", () => {
    expect(customerSessionToken("c1")).toBe(customerSessionToken("c1"));
    expect(customerSessionToken("c1")).not.toBe(customerSessionToken("c2"));
  });

  it("is domain-separated from the admin session token", () => {
    // Same secret must never yield a customer token equal to the admin token.
    expect(customerSessionToken("admin-session-v1")).not.toBe(adminSessionToken());
  });

  it("cookie value embeds the customer id and its mac", () => {
    const value = makeSessionCookieValue("c123");
    expect(value.startsWith("c123.")).toBe(true);
    expect(value.split(".")[1]).toBe(customerSessionToken("c123"));
  });
});
