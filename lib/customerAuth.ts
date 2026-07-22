import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Customer } from "@prisma/client";

/**
 * Optional customer accounts. Guests never touch any of this — booking works
 * without a session, exactly as before.
 *
 * Passwords: scrypt with a per-user salt, stored as "scrypt$<salt>$<hash>".
 * Sessions: cookie "<customerId>.<hmac>", domain-separated from the admin
 * session by the "customer:" prefix inside the MAC.
 */

export const CUSTOMER_COOKIE = "tabarca_customer";
export const MIN_PASSWORD_LENGTH = 8;

function secret(): string {
  return process.env.ADMIN_COOKIE_SECRET ?? "dev-secret-not-for-production";
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function customerSessionToken(customerId: string): string {
  return createHmac("sha256", secret()).update(`customer:${customerId}`).digest("hex");
}

export function makeSessionCookieValue(customerId: string): string {
  return `${customerId}.${customerSessionToken(customerId)}`;
}

function parseSessionCookie(value: string): string | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const customerId = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  const expected = customerSessionToken(customerId);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? customerId : null;
}

/** The logged-in customer, or null for guests/invalid sessions. */
export async function getSessionCustomer(): Promise<Customer | null> {
  const value = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!value) return null;
  const customerId = parseSessionCookie(value);
  if (!customerId) return null;
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  // Only account holders get sessions; a stale cookie for a deleted or
  // password-less customer is treated as logged out.
  return customer?.passwordHash ? customer : null;
}
