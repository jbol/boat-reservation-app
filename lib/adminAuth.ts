import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "tabarca_admin";

function secret(): string {
  return process.env.ADMIN_COOKIE_SECRET ?? "dev-secret-not-for-production";
}

/** Deterministic session token — one admin user, no per-session state needed yet. */
export function sessionToken(): string {
  return createHmac("sha256", secret()).update("admin-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const h = (s: string) => createHmac("sha256", secret()).update(s).digest("hex");
  return safeEqual(h(candidate), h(expected));
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!value && safeEqual(value, sessionToken());
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}
