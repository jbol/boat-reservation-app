"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ReservationStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { ADMIN_COOKIE, passwordMatches, requireAdmin, sessionToken } from "./adminAuth";

function count(formData: FormData, name: string): number {
  const n = Number(formData.get(name) ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 50) : 0;
}

type FareLike = { code: string; priceCents: number };

function estimateCents(
  fares: FareLike[],
  counts: { adult: number; child: number; infant: number },
): number {
  const price = (code: string) => fares.find((f) => f.code === code)?.priceCents ?? 0;
  return (
    counts.adult * price("adult") +
    counts.child * price("child") +
    counts.infant * price("infant")
  );
}

async function findOrCreateCustomer(
  name: string,
  email: string,
  phone: string | null,
  locale: string,
) {
  const existing = await prisma.customer.findFirst({ where: { email } });
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: { name, phone: phone ?? existing.phone, locale },
    });
  }
  return prisma.customer.create({ data: { name, email, phone, locale } });
}

// ---------------------------------------------------------------------------
// Public flow
// ---------------------------------------------------------------------------

export async function createReservation(formData: FormData) {
  const sailingId = String(formData.get("sailingId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const locale = String(formData.get("locale") ?? "es") === "en" ? "en" : "es";
  const counts = {
    adult: count(formData, "count_adult"),
    child: count(formData, "count_child"),
    infant: count(formData, "count_infant"),
  };

  const sailing = await prisma.sailing.findUnique({
    where: { id: sailingId },
    include: { route: { include: { fares: true } } },
  });
  if (!sailing || sailing.status !== "SCHEDULED") redirect("/");
  if (!name || !email || counts.adult + counts.child + counts.infant === 0) {
    redirect(`/book/${sailingId}?error=1`);
  }

  const customer = await findOrCreateCustomer(name, email, phone, locale);
  const reservation = await prisma.reservation.create({
    data: {
      sailingId,
      customerId: customer.id,
      adults: counts.adult,
      children: counts.child,
      infants: counts.infant,
      estTotalCents: estimateCents(sailing.route.fares, counts),
      status: "INTENT",
      source: "HANDOFF",
    },
  });

  redirect(`/r/${reservation.id}`);
}

export async function attachBookingRef(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const externalRef = String(formData.get("externalRef") ?? "").trim();
  if (id && externalRef) {
    await prisma.reservation.updateMany({
      where: { id, status: "INTENT" },
      data: { status: "CONFIRMED", externalRef },
    });
  }
  revalidatePath(`/r/${id}`);
  redirect(`/r/${id}`);
}

export async function cancelReservation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.reservation.updateMany({
      where: { id, status: { in: ["INTENT", "CONFIRMED"] } },
      data: { status: "CANCELLED" },
    });
  }
  revalidatePath(`/r/${id}`);
  redirect(`/r/${id}`);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) redirect("/admin?error=1");

  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/admin");
}

export async function adminLogout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

export async function adminUpdateReservation(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const externalRef = String(formData.get("externalRef") ?? "").trim();

  if (!id || !(status in ReservationStatus)) return;

  await prisma.reservation.update({
    where: { id },
    data: {
      status: status as ReservationStatus,
      ...(externalRef ? { externalRef } : {}),
    },
  });
  revalidatePath("/admin");
}

export async function adminCreateReservation(formData: FormData) {
  await requireAdmin();
  const sailingId = String(formData.get("sailingId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const externalRef = String(formData.get("externalRef") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "CONFIRMED");
  const counts = {
    adult: count(formData, "count_adult"),
    child: count(formData, "count_child"),
    infant: count(formData, "count_infant"),
  };

  const sailing = await prisma.sailing.findUnique({
    where: { id: sailingId },
    include: { route: { include: { fares: true } } },
  });
  if (!sailing || !name || !email || counts.adult + counts.child + counts.infant === 0) {
    redirect("/admin/new?error=1");
  }

  const customer = await findOrCreateCustomer(name, email, phone, "es");
  await prisma.reservation.create({
    data: {
      sailingId,
      customerId: customer.id,
      adults: counts.adult,
      children: counts.child,
      infants: counts.infant,
      estTotalCents: estimateCents(sailing.route.fares, counts),
      status: status in ReservationStatus ? (status as ReservationStatus) : "CONFIRMED",
      source: "MANUAL",
      externalRef,
      notes,
    },
  });

  redirect("/admin");
}
