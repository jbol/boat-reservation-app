/**
 * Seed data transcribed from the operators' public websites on 2026-07-04
 * (Kontiki, Transtabarca, Tabarkeras) and 2026-07-21 (Marítimas Torrevieja).
 * Summer 2026 timetables — operators warn that times can change without
 * notice, so verify against their sites before relying on this in production.
 * Checked and NOT seeded (no 2026 service): Benidorm & El Campello (EMB
 * suspended the route), Calpe/Altea/Villajoyosa/Dénia (no operator),
 * Guardamar (private charters only). See PLAN.md §2.
 * Re-runnable: upserts + createMany(skipDuplicates), never deletes.
 */
import { PrismaClient } from "@prisma/client";
import { applyTimetables } from "../lib/timetables";

const prisma = new PrismaClient();

const SEASON_START = "2026-07-04";
const SEASON_END = "2026-09-30";

async function main() {
  // ---- Ports -------------------------------------------------------------
  const ports = [
    { id: "port-alicante", slug: "alicante", nameEs: "Alicante", nameEn: "Alicante" },
    { id: "port-santa-pola", slug: "santa-pola", nameEs: "Santa Pola", nameEn: "Santa Pola" },
    { id: "port-torrevieja", slug: "torrevieja", nameEs: "Torrevieja", nameEn: "Torrevieja" },
    { id: "port-tabarca", slug: "tabarca", nameEs: "Isla de Tabarca", nameEn: "Tabarca Island" },
  ];
  for (const p of ports) {
    await prisma.port.upsert({ where: { id: p.id }, update: p, create: p });
  }

  // ---- Cruceros Kontiki (Alicante) ----------------------------------------
  const kontiki = {
    id: "op-kontiki",
    slug: "kontiki",
    name: "Cruceros Kontiki",
    homeUrl: "https://cruceroskontiki.com/",
    bookingUrl: "https://cruceroskontiki.com/venta-de-tickets/",
    blurbEs:
      "Catamaranes desde el puerto de Alicante desde 1966, dos con visión submarina. Billete ida y vuelta con regreso abierto.",
    blurbEn:
      "Catamarans from Alicante port since 1966, two with underwater viewing. Round-trip ticket with open return.",
    tier: "deeplink",
    scheduleVerified: true,
    scheduleCheckedAt: new Date("2026-07-04"),
  };
  await prisma.operator.upsert({ where: { id: kontiki.id }, update: kontiki, create: kontiki });

  const kontikiRoute = {
    id: "route-kontiki-alicante",
    operatorId: kontiki.id,
    originPortId: "port-alicante",
    durationMin: 60,
    durationNoteEs: "aprox.",
    durationNoteEn: "approx.",
    returnNoteEs:
      "Regreso abierto — vuelve en cualquier barco. Salidas desde Tabarca: lun–jue y dom 16:00, 17:30 y 18:15 · vie y sáb 16:00 y 18:15.",
    returnNoteEn:
      "Open return — take any boat back. Departures from Tabarca: Mon–Thu & Sun 16:00, 17:30 & 18:15 · Fri & Sat 16:00 & 18:15.",
  };
  await prisma.route.upsert({
    where: { id: kontikiRoute.id },
    update: kontikiRoute,
    create: kontikiRoute,
  });

  const kontikiFares = [
    {
      id: "fare-kontiki-adult",
      routeId: kontikiRoute.id,
      code: "adult",
      labelEs: "Adulto (ida y vuelta)",
      labelEn: "Adult (round trip)",
      priceCents: 2400,
    },
    {
      id: "fare-kontiki-infant",
      routeId: kontikiRoute.id,
      code: "infant",
      labelEs: "Niños 0–4 años",
      labelEn: "Children 0–4",
      priceCents: 0,
      noteEs: "Gratis",
      noteEn: "Free",
    },
  ];
  for (const f of kontikiFares) {
    await prisma.fareType.upsert({ where: { id: f.id }, update: f, create: f });
  }

  // Sailings for all routes are materialized from Timetable rows at the end.

  // ---- Transtabarca (Santa Pola) -------------------------------------------
  const transtabarca = {
    id: "op-transtabarca",
    slug: "transtabarca",
    name: "Transtabarca",
    homeUrl: "https://www.islatabarca.com/",
    bookingUrl: "https://www.islatabarca.com/barco-a-tabarca/",
    blurbEs:
      "Barcos rápidos (15 min) y catamaranes con visión submarina (25 min) desde Santa Pola. Ticket abierto: viaja en el horario que prefieras.",
    blurbEn:
      "Fast boats (15 min) and underwater-vision catamarans (25 min) from Santa Pola. Open ticket: travel at whichever time suits you.",
    tier: "deeplink",
    scheduleVerified: true,
    scheduleCheckedAt: new Date("2026-07-04"),
  };
  await prisma.operator.upsert({
    where: { id: transtabarca.id },
    update: transtabarca,
    create: transtabarca,
  });

  const transRoute = {
    id: "route-transtabarca-santa-pola",
    operatorId: transtabarca.id,
    originPortId: "port-santa-pola",
    durationMin: 25,
    durationNoteEs: "15 min barco rápido · 25 min catamarán",
    durationNoteEn: "15 min fast boat · 25 min catamaran",
    returnNoteEs:
      "Ticket abierto — regresa en cualquier barco. Salidas desde Tabarca: 10:30, 11:15, 12:10, 12:45, 13:45, 14:50, 16:15, 17:10, 18:10, 19:30 y 20:30.",
    returnNoteEn:
      "Open ticket — take any boat back. Departures from Tabarca: 10:30, 11:15, 12:10, 12:45, 13:45, 14:50, 16:15, 17:10, 18:10, 19:30 & 20:30.",
  };
  await prisma.route.upsert({ where: { id: transRoute.id }, update: transRoute, create: transRoute });

  const transFares = [
    {
      id: "fare-trans-adult",
      routeId: transRoute.id,
      code: "adult",
      labelEs: "Adulto (ida y vuelta)",
      labelEn: "Adult (round trip)",
      priceCents: 900,
      noteEs: "Precio online (12 € en taquilla)",
      noteEn: "Online price (€12 at the ticket office)",
    },
    {
      id: "fare-trans-child",
      routeId: transRoute.id,
      code: "child",
      labelEs: "Niños 4–8 años",
      labelEn: "Children 4–8",
      priceCents: 800,
      noteEs: "Precio online",
      noteEn: "Online price",
    },
    {
      id: "fare-trans-infant",
      routeId: transRoute.id,
      code: "infant",
      labelEs: "Menores de 4 años",
      labelEn: "Under 4",
      priceCents: 0,
      noteEs: "Gratis",
      noteEn: "Free",
    },
  ];
  for (const f of transFares) {
    await prisma.fareType.upsert({ where: { id: f.id }, update: f, create: f });
  }


  // ---- Tabarkeras (Santa Pola) — known operator, timetable not yet verified --
  const tabarkeras = {
    id: "op-tabarkeras",
    slug: "tabarkeras",
    name: "Tabarkeras",
    homeUrl: "https://tabarkeras.com/",
    bookingUrl: "https://tabarkeras.com/event/ticket-tabarkeras/",
    blurbEs:
      "Más de 50 años navegando entre Santa Pola y Tabarca. Hasta 16 salidas diarias (9:00–19:00) en temporada; ticket abierto, compra hoy y úsalo cualquier día.",
    blurbEn:
      "Over 50 years sailing between Santa Pola and Tabarca. Up to 16 daily departures (9:00–19:00) in season; open ticket — buy today, use it any day.",
    tier: "deeplink",
    scheduleVerified: false,
  };
  await prisma.operator.upsert({
    where: { id: tabarkeras.id },
    update: tabarkeras,
    create: tabarkeras,
  });

  // ---- Marítimas Torrevieja (Torrevieja) — verified 2026-07-21 -------------
  // Day trip with FIXED returns (openReturn: false), unlike the other routes.
  const maritimas = {
    id: "op-maritimas-torrevieja",
    slug: "maritimas-torrevieja",
    name: "Marítimas Torrevieja",
    homeUrl: "https://maritimastorrevieja.es/",
    bookingUrl: "https://maritimastorrevieja.es/tickets/",
    blurbEs:
      "Catamarán con visión submarina desde el puerto de Torrevieja, navegando desde 1989. Excursión de un día: ~1 h de travesía y 5–6 h en la isla. Mascotas gratis y acceso para movilidad reducida.",
    blurbEn:
      "Underwater-vision catamaran from Torrevieja port, sailing since 1989. Day trip: ~1 h crossing and 5–6 h on the island. Pets travel free; reduced-mobility access.",
    tier: "deeplink",
    scheduleVerified: true,
    scheduleCheckedAt: new Date("2026-07-21"),
  };
  await prisma.operator.upsert({ where: { id: maritimas.id }, update: maritimas, create: maritimas });

  const maritimasRoute = {
    id: "route-maritimas-torrevieja",
    operatorId: maritimas.id,
    originPortId: "port-torrevieja",
    durationMin: 60,
    durationNoteEs: "aprox.",
    durationNoteEn: "approx.",
    openReturn: false,
    returnNoteEs:
      "Excursión de un día con vuelta fija: julio y septiembre, vuelta desde Tabarca a las 18:30 · agosto (lun–sáb): salida 09:30 → vuelta 17:30 y salida 12:15 → vuelta 20:15 · domingos de agosto: 10:45 → 19:00.",
    returnNoteEn:
      "Day trip with a fixed return: July & September, return from Tabarca at 18:30 · August (Mon–Sat): 09:30 departure → 17:30 return and 12:15 departure → 20:15 return · August Sundays: 10:45 → 19:00.",
  };
  await prisma.route.upsert({
    where: { id: maritimasRoute.id },
    update: maritimasRoute,
    create: maritimasRoute,
  });

  const maritimasFares = [
    {
      id: "fare-maritimas-adult",
      routeId: maritimasRoute.id,
      code: "adult",
      labelEs: "Adulto (ida y vuelta)",
      labelEn: "Adult (round trip)",
      priceCents: 2900,
      noteEs: "Reducida 27 € para estudiantes y personas con discapacidad",
      noteEn: "Reduced €27 for students and disabled visitors",
    },
    {
      id: "fare-maritimas-child",
      routeId: maritimasRoute.id,
      code: "child",
      labelEs: "Niños 3–10 años",
      labelEn: "Children 3–10",
      priceCents: 1900,
    },
    {
      id: "fare-maritimas-infant",
      routeId: maritimasRoute.id,
      code: "infant",
      labelEs: "Menores de 3 años",
      labelEn: "Under 3",
      priceCents: 0,
      noteEs: "Gratis",
      noteEn: "Free",
    },
  ];
  for (const f of maritimasFares) {
    await prisma.fareType.upsert({ where: { id: f.id }, update: f, create: f });
  }


  // ---- Return crossings FROM Tabarca (informational — not bookable) --------
  // Powers the "Desde: Isla de Tabarca" view for people on the island. Return
  // legs are covered by the round-trip tickets, so these routes carry no
  // fares and the UI renders no Book button. Times from the same verified
  // sources as the outbound schedules.
  const returnRoutes = [
    {
      id: "route-kontiki-return",
      operatorId: kontiki.id,
      originPortId: "port-tabarca",
      destinationEs: "Alicante",
      destinationEn: "Alicante",
      durationMin: 60,
      durationNoteEs: "aprox.",
      durationNoteEn: "approx.",
      openReturn: true,
      returnNoteEs:
        "Vuelta incluida en el billete de ida y vuelta de Kontiki — súbete a cualquiera de sus barcos.",
      returnNoteEn: "Return included in Kontiki's round-trip ticket — take any of their boats.",
    },
    {
      id: "route-transtabarca-return",
      operatorId: transtabarca.id,
      originPortId: "port-tabarca",
      destinationEs: "Santa Pola",
      destinationEn: "Santa Pola",
      durationMin: 25,
      durationNoteEs: "15 min barco rápido · 25 min catamarán",
      durationNoteEn: "15 min fast boat · 25 min catamaran",
      openReturn: true,
      returnNoteEs:
        "Ticket abierto de Transtabarca — vuelve en cualquiera de sus barcos.",
      returnNoteEn: "Transtabarca open ticket — take any of their boats back.",
    },
    {
      id: "route-maritimas-return",
      operatorId: maritimas.id,
      originPortId: "port-tabarca",
      destinationEs: "Torrevieja",
      destinationEn: "Torrevieja",
      durationMin: 60,
      durationNoteEs: "aprox.",
      durationNoteEn: "approx.",
      openReturn: false,
      returnNoteEs:
        "Vuelta fija de la excursión de día de Marítimas Torrevieja.",
      returnNoteEn: "Fixed return of the Marítimas Torrevieja day trip.",
    },
  ];
  for (const r of returnRoutes) {
    await prisma.route.upsert({ where: { id: r.id }, update: r, create: r });
  }

  // ---- Timetables: the editable source of truth (masks are Sunday-first) ---
  const AUG_FROM = "2026-08-01";
  const AUG_TO = "2026-08-31";
  const timetables = [
    // Kontiki outbound: Mon–Thu, Sat, Sun 4 sailings · Fri 3
    { id: "tt-kontiki-main", routeId: "route-kontiki-alicante", validFrom: SEASON_START, validTo: SEASON_END, daysMask: "1111101", times: ["09:45", "10:45", "12:00", "13:15"] },
    { id: "tt-kontiki-fri", routeId: "route-kontiki-alicante", validFrom: SEASON_START, validTo: SEASON_END, daysMask: "0000010", times: ["09:45", "10:45", "12:15"] },
    // Transtabarca outbound: daily base + weekend 09:30 extra
    { id: "tt-trans-base", routeId: "route-transtabarca-santa-pola", validFrom: SEASON_START, validTo: SEASON_END, daysMask: "1111111", times: ["10:00", "10:45", "11:30", "12:00", "12:30", "13:00", "14:00", "15:30", "16:30", "17:30", "18:30", "19:30"] },
    { id: "tt-trans-weekend", routeId: "route-transtabarca-santa-pola", validFrom: SEASON_START, validTo: SEASON_END, daysMask: "1000001", times: ["09:30"] },
    // Marítimas Torrevieja outbound: Jul & Sep daily 10:45 · Aug Mon–Sat 2 rotations, Sun 10:45
    { id: "tt-mt-jul", routeId: "route-maritimas-torrevieja", validFrom: SEASON_START, validTo: "2026-07-31", daysMask: "1111111", times: ["10:45"] },
    { id: "tt-mt-sep", routeId: "route-maritimas-torrevieja", validFrom: "2026-09-01", validTo: SEASON_END, daysMask: "1111111", times: ["10:45"] },
    { id: "tt-mt-aug-mosat", routeId: "route-maritimas-torrevieja", validFrom: AUG_FROM, validTo: AUG_TO, daysMask: "0111111", times: ["09:30", "12:15"] },
    { id: "tt-mt-aug-sun", routeId: "route-maritimas-torrevieja", validFrom: AUG_FROM, validTo: AUG_TO, daysMask: "1000000", times: ["10:45"] },
    // Returns from Tabarca
    { id: "tt-kontiki-ret-main", routeId: "route-kontiki-return", validFrom: SEASON_START, validTo: SEASON_END, daysMask: "1111100", times: ["16:00", "17:30", "18:15"] },
    { id: "tt-kontiki-ret-frisat", routeId: "route-kontiki-return", validFrom: SEASON_START, validTo: SEASON_END, daysMask: "0000011", times: ["16:00", "18:15"] },
    { id: "tt-trans-ret", routeId: "route-transtabarca-return", validFrom: SEASON_START, validTo: SEASON_END, daysMask: "1111111", times: ["10:30", "11:15", "12:10", "12:45", "13:45", "14:50", "16:15", "17:10", "18:10", "19:30", "20:30"] },
    { id: "tt-mt-ret-jul", routeId: "route-maritimas-return", validFrom: SEASON_START, validTo: "2026-07-31", daysMask: "1111111", times: ["18:30"] },
    { id: "tt-mt-ret-sep", routeId: "route-maritimas-return", validFrom: "2026-09-01", validTo: SEASON_END, daysMask: "1111111", times: ["18:30"] },
    { id: "tt-mt-ret-aug-mosat", routeId: "route-maritimas-return", validFrom: AUG_FROM, validTo: AUG_TO, daysMask: "0111111", times: ["17:30", "20:15"] },
    { id: "tt-mt-ret-aug-sun", routeId: "route-maritimas-return", validFrom: AUG_FROM, validTo: AUG_TO, daysMask: "1000000", times: ["19:00"] },
  ];
  for (const t of timetables) {
    await prisma.timetable.upsert({ where: { id: t.id }, update: t, create: t });
  }

  // Materialize sailings from timetables via the same engine the admin uses.
  // On an already-seeded database every route should report created:0.
  const routeIds = [...new Set(timetables.map((t) => t.routeId))];
  for (const routeId of routeIds) {
    const result = await applyTimetables(prisma, routeId, SEASON_START, SEASON_END);
    console.log(
      `apply ${routeId}: +${result.created} kept ${result.kept} cancelled ${result.cancelled} deleted ${result.deleted}`,
    );
  }

  const counts = {
    operators: await prisma.operator.count(),
    routes: await prisma.route.count(),
    sailings: await prisma.sailing.count(),
    fares: await prisma.fareType.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
