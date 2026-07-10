import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { euros, formatDateKey } from "./format";
import type { Locale } from "./i18n";

/**
 * All senders are fire-safe: they log failures and never throw, so a booking
 * is never lost because SMTP hiccuped. Without SMTP_HOST configured (local
 * dev), emails are printed to the server console instead of sent.
 */

export async function getBaseUrl(): Promise<string> {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });
}

async function sendEmail(to: string, subject: string, text: string, html: string) {
  try {
    const t = transport();
    if (!t) {
      console.log(`[email:console-mode] to=${to} subject="${subject}"\n${text}\n---`);
      return;
    }
    await t.sendMail({
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, error);
  }
}

function htmlLayout(bodyHtml: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <p style="font-size:18px;font-weight:bold;color:#075985">⛵ Tabarca Boats</p>
  ${bodyHtml}
  <p style="font-size:12px;color:#64748b;margin-top:24px">Tabarca Boats · tabarca-boats</p>
</div>`;
}

function button(href: string, label: string): string {
  return `<p><a href="${href}" style="display:inline-block;background:#0369a1;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`;
}

type ReservationForEmail = NonNullable<Awaited<ReturnType<typeof loadReservation>>>;

function loadReservation(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      customer: true,
      sailing: { include: { route: { include: { operator: true, originPort: true } } } },
    },
  });
}

function summaryLine(r: ReservationForEmail, locale: Locale): string {
  const port = locale === "es" ? r.sailing.route.originPort.nameEs : r.sailing.route.originPort.nameEn;
  const from = locale === "es" ? "desde" : "from";
  return `${formatDateKey(r.sailing.dateKey, locale)} · ${r.sailing.departureTime} · ${r.sailing.route.operator.name} (${from} ${port})`;
}

export async function sendReservationIntentEmail(reservationId: string) {
  const r = await loadReservation(reservationId);
  if (!r) return;
  const locale = (r.customer.locale === "en" ? "en" : "es") as Locale;
  const base = await getBaseUrl();
  const resUrl = `${base}/r/${r.id}`;
  const op = r.sailing.route.operator;
  const summary = summaryLine(r, locale);
  const total = r.estTotalCents != null ? euros(r.estTotalCents, locale) : "";

  const es = {
    subject: "Tu reserva para Tabarca — te queda un paso",
    text: `Hola ${r.customer.name}:\n\nHemos guardado tu reserva:\n${summary}\nTotal estimado: ${total}\n\nTe queda un paso:\n1. Compra tus billetes en la web oficial de ${op.name}: ${op.bookingUrl}\n2. Guarda tu referencia de compra aquí: ${resUrl}\n\nEl pago se hace en la web de la naviera; nosotros solo guardamos tu reserva.`,
    html: htmlLayout(
      `<p>Hola ${r.customer.name}:</p><p>Hemos guardado tu reserva:</p><p><strong>${summary}</strong><br>Total estimado: <strong>${total}</strong></p><p>Te queda un paso:</p><ol><li>Compra tus billetes en la web oficial de ${op.name}.${button(op.bookingUrl, `Comprar en ${op.name}`)}</li><li>Vuelve y guarda tu referencia de compra.${button(resUrl, "Mi reserva")}</li></ol><p style="color:#64748b;font-size:13px">El pago se hace en la web de la naviera; nosotros solo guardamos tu reserva.</p>`,
    ),
  };
  const en = {
    subject: "Your Tabarca reservation — one step left",
    text: `Hi ${r.customer.name},\n\nWe've saved your reservation:\n${summary}\nEstimated total: ${total}\n\nOne step left:\n1. Buy your tickets on ${op.name}'s official website: ${op.bookingUrl}\n2. Save your booking reference here: ${resUrl}\n\nPayment happens on the operator's website; we just keep track of your reservation.`,
    html: htmlLayout(
      `<p>Hi ${r.customer.name},</p><p>We've saved your reservation:</p><p><strong>${summary}</strong><br>Estimated total: <strong>${total}</strong></p><p>One step left:</p><ol><li>Buy your tickets on ${op.name}'s official website.${button(op.bookingUrl, `Buy on ${op.name}`)}</li><li>Come back and save your booking reference.${button(resUrl, "My reservation")}</li></ol><p style="color:#64748b;font-size:13px">Payment happens on the operator's website; we just keep track of your reservation.</p>`,
    ),
  };
  const m = locale === "es" ? es : en;
  await sendEmail(r.customer.email, m.subject, m.text, m.html);
}

export async function sendReservationConfirmedEmail(reservationId: string) {
  const r = await loadReservation(reservationId);
  if (!r) return;
  const locale = (r.customer.locale === "en" ? "en" : "es") as Locale;
  const base = await getBaseUrl();
  const resUrl = `${base}/r/${r.id}`;
  const op = r.sailing.route.operator;
  const summary = summaryLine(r, locale);
  const returnNote =
    (locale === "es" ? r.sailing.route.returnNoteEs : r.sailing.route.returnNoteEn) ?? "";
  const ref = r.externalRef ? `\n${locale === "es" ? "Referencia" : "Reference"}: ${r.externalRef}` : "";

  const m =
    locale === "es"
      ? {
          subject: `Reserva confirmada — ${r.sailing.dateKey} ${r.sailing.departureTime}`,
          text: `Hola ${r.customer.name}:\n\nTu reserva está confirmada:\n${summary}${ref}\n\n${returnNote}\n\nEnseña la confirmación de ${op.name} al embarcar. Tu reserva: ${resUrl}`,
          html: htmlLayout(
            `<p>Hola ${r.customer.name}:</p><p>Tu reserva está <strong style="color:#047857">confirmada</strong>:</p><p><strong>${summary}</strong>${r.externalRef ? `<br>Referencia: <strong>${r.externalRef}</strong>` : ""}</p><p style="color:#334155;font-size:14px">${returnNote}</p><p>Enseña la confirmación de ${op.name} al embarcar.</p>${button(resUrl, "Ver mi reserva")}`,
          ),
        }
      : {
          subject: `Reservation confirmed — ${r.sailing.dateKey} ${r.sailing.departureTime}`,
          text: `Hi ${r.customer.name},\n\nYour reservation is confirmed:\n${summary}${ref}\n\n${returnNote}\n\nShow ${op.name}'s confirmation when you board. Your reservation: ${resUrl}`,
          html: htmlLayout(
            `<p>Hi ${r.customer.name},</p><p>Your reservation is <strong style="color:#047857">confirmed</strong>:</p><p><strong>${summary}</strong>${r.externalRef ? `<br>Reference: <strong>${r.externalRef}</strong>` : ""}</p><p style="color:#334155;font-size:14px">${returnNote}</p><p>Show ${op.name}'s confirmation when you board.</p>${button(resUrl, "View my reservation")}`,
          ),
        };
  await sendEmail(r.customer.email, m.subject, m.text, m.html);
}

export async function sendSailingCancelledEmail(reservationId: string) {
  const r = await loadReservation(reservationId);
  if (!r) return;
  const locale = (r.customer.locale === "en" ? "en" : "es") as Locale;
  const base = await getBaseUrl();
  const resUrl = `${base}/r/${r.id}`;
  const altUrl = `${base}/?date=${r.sailing.dateKey}`;
  const op = r.sailing.route.operator;
  const summary = summaryLine(r, locale);

  const m =
    locale === "es"
      ? {
          subject: `⚠ Salida cancelada — ${r.sailing.dateKey} ${r.sailing.departureTime}`,
          text: `Hola ${r.customer.name}:\n\nLa naviera ha cancelado esta salida (habitualmente por el estado del mar):\n${summary}\n\nSi ya compraste billetes, contacta con ${op.name} (${op.homeUrl}) para el cambio o reembolso según su política.\n\nBuscar otro barco: ${altUrl}\nTu reserva: ${resUrl}`,
          html: htmlLayout(
            `<p>Hola ${r.customer.name}:</p><p><strong style="color:#b91c1c">La naviera ha cancelado esta salida</strong> (habitualmente por el estado del mar):</p><p><strong>${summary}</strong></p><p>Si ya compraste billetes, contacta con <a href="${op.homeUrl}">${op.name}</a> para el cambio o reembolso según su política.</p>${button(altUrl, "Buscar otro barco")}<p><a href="${resUrl}">Tu reserva</a></p>`,
          ),
        }
      : {
          subject: `⚠ Sailing cancelled — ${r.sailing.dateKey} ${r.sailing.departureTime}`,
          text: `Hi ${r.customer.name},\n\nThe operator has cancelled this sailing (usually due to sea conditions):\n${summary}\n\nIf you already bought tickets, contact ${op.name} (${op.homeUrl}) about rebooking or a refund under their policy.\n\nFind another boat: ${altUrl}\nYour reservation: ${resUrl}`,
          html: htmlLayout(
            `<p>Hi ${r.customer.name},</p><p><strong style="color:#b91c1c">The operator has cancelled this sailing</strong> (usually due to sea conditions):</p><p><strong>${summary}</strong></p><p>If you already bought tickets, contact <a href="${op.homeUrl}">${op.name}</a> about rebooking or a refund under their policy.</p>${button(altUrl, "Find another boat")}<p><a href="${resUrl}">Your reservation</a></p>`,
          ),
        };
  await sendEmail(r.customer.email, m.subject, m.text, m.html);
}

export async function sendLookupEmail(
  email: string,
  locale: Locale,
  reservations: { id: string; dateKey: string; departureTime: string; operatorName: string; status: string }[],
) {
  const base = await getBaseUrl();
  const lines = reservations.map(
    (r) => `- ${r.dateKey} ${r.departureTime} · ${r.operatorName} · ${r.status}: ${base}/r/${r.id}`,
  );
  const items = reservations.map(
    (r) =>
      `<li><a href="${base}/r/${r.id}"><strong>${r.dateKey} ${r.departureTime}</strong> · ${r.operatorName}</a> · ${r.status}</li>`,
  );
  const m =
    locale === "es"
      ? {
          subject: "Tus reservas en Tabarca Boats",
          text: `Estas son tus reservas activas:\n\n${lines.join("\n")}`,
          html: htmlLayout(`<p>Estas son tus reservas activas:</p><ul>${items.join("")}</ul>`),
        }
      : {
          subject: "Your Tabarca Boats reservations",
          text: `Here are your active reservations:\n\n${lines.join("\n")}`,
          html: htmlLayout(`<p>Here are your active reservations:</p><ul>${items.join("")}</ul>`),
        };
  await sendEmail(email, m.subject, m.text, m.html);
}
