/**
 * Sliding-window rate limiter for auth surfaces (login, signup, lookup).
 * In-memory by design: the app runs as one long-lived Node process on
 * Hostinger, and losing counts on a restart is an acceptable trade for zero
 * schema/dependency cost at this scale.
 *
 * Only FAILED attempts are recorded (isRateLimited never consumes), so
 * legitimate users logging in successfully never burn quota.
 */

const failures = new Map<string, number[]>();
const MAX_KEYS = 10_000;

/** True when `key` has accumulated `limit`+ failures inside the window. */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const cutoff = now - windowMs;
  const recent = (failures.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length === 0) failures.delete(key);
  else failures.set(key, recent);
  return recent.length >= limit;
}

export function recordFailure(key: string, now: number = Date.now()): void {
  // Bound memory under abuse: drop the oldest keys wholesale.
  if (failures.size >= MAX_KEYS && !failures.has(key)) {
    const oldest = failures.keys().next().value;
    if (oldest !== undefined) failures.delete(oldest);
  }
  const list = failures.get(key) ?? [];
  list.push(now);
  failures.set(key, list);
}

/** Test helper. */
export function resetRateLimits(): void {
  failures.clear();
}

// Policy constants, shared by the server actions.
export const LOGIN_EMAIL_LIMIT = 5;
export const LOGIN_IP_LIMIT = 100;
export const ADMIN_IP_LIMIT = 10;
export const SIGNUP_IP_LIMIT = 10;
export const FIND_IP_LIMIT = 5;
export const WINDOW_15_MIN = 15 * 60 * 1000;
export const WINDOW_30_MIN = 30 * 60 * 1000;
