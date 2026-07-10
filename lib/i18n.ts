import { cookies } from "next/headers";

export type Locale = "es" | "en";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("lang")?.value;
  return value === "en" ? "en" : "es";
}

const dictionaries = {
  es: {
    appName: "Tabarca Boats",
    tagline: "Todos los barcos a la Isla de Tabarca, en un solo lugar",
    subTagline:
      "Compara horarios y precios de las navieras y reserva en sus sistemas oficiales.",
    date: "Fecha",
    showBoats: "Ver barcos",
    today: "Hoy",
    sailingsFor: "Salidas del",
    noSailings: "No hay salidas registradas para este día.",
    fromPort: "desde",
    approxDuration: "trayecto",
    openReturn: "Vuelta abierta",
    book: "Reservar",
    perAdult: "adulto, ida y vuelta",
    moreOperators: "Más navieras",
    unverifiedNote:
      "Horarios aún no verificados en nuestra base de datos — consulta y reserva directamente en su web.",
    visitSite: "Ir a su web",
    // Booking page
    bookTitle: "Reserva tu viaje",
    passengers: "Pasajeros",
    yourDetails: "Tus datos",
    nameLabel: "Nombre y apellidos",
    emailLabel: "Email",
    phoneLabel: "Teléfono (opcional)",
    free: "Gratis",
    payNote:
      "El pago se hace en la web oficial de {op}. Aquí guardamos tu reserva para que puedas gestionarla en un solo lugar.",
    continueBtn: "Continuar",
    returnHeading: "Barcos de vuelta",
    // Reservation page
    resTitle: "Tu reserva",
    oneStepLeft: "Te queda un paso",
    step1: "Compra tus billetes en la web de {op} — se abre en una pestaña nueva.",
    openSite: "Comprar en {op}",
    step2: "Vuelve aquí y guarda la referencia de tu compra para tenerlo todo junto.",
    refLabel: "Referencia de reserva",
    refPlaceholder: "p. ej. KT-12345",
    saveRef: "Guardar referencia",
    cancelIntent: "Cancelar esta reserva",
    confirmedThanks:
      "¡Todo listo! Enseña la confirmación de {op} al embarcar.",
    cancelledMsg: "Esta reserva está cancelada.",
    reference: "Referencia",
    estTotal: "Total estimado",
    statusWord: "Estado",
    statusINTENT: "Pendiente de compra",
    statusCONFIRMED: "Confirmada",
    statusCOMPLETED: "Completada",
    statusCANCELLED: "Cancelada",
    adults: "Adultos",
    children: "Niños",
    infants: "Bebés",
    backHome: "← Volver a los horarios",
    navFind: "Mis reservas",
    findTitle: "Encuentra tus reservas",
    findIntro:
      "Escribe tu email y te enviaremos los enlaces de tus reservas activas.",
    findSubmit: "Enviarme mis reservas",
    findSent:
      "Si hay reservas asociadas a ese email, te hemos enviado los enlaces. Revisa también la carpeta de spam.",
    sailingCancelledBanner:
      "La naviera ha cancelado esta salida (habitualmente por el estado del mar). Si ya compraste billetes, contacta con la naviera para el cambio o reembolso según su política.",
    findAnotherBoat: "Buscar otra salida",
    scheduleDisclaimer:
      "Los horarios y precios provienen de las webs oficiales de las navieras (julio 2026) y pueden cambiar sin previo aviso. Confírmalos siempre al comprar.",
  },
  en: {
    appName: "Tabarca Boats",
    tagline: "Every boat to Tabarca Island, in one place",
    subTagline:
      "Compare operators' schedules and prices, and book through their official systems.",
    date: "Date",
    showBoats: "Show boats",
    today: "Today",
    sailingsFor: "Departures on",
    noSailings: "No departures on record for this day.",
    fromPort: "from",
    approxDuration: "crossing",
    openReturn: "Open return",
    book: "Book",
    perAdult: "adult, round trip",
    moreOperators: "More operators",
    unverifiedNote:
      "Timetable not verified in our database yet — check and book directly on their site.",
    visitSite: "Visit their site",
    // Booking page
    bookTitle: "Book your trip",
    passengers: "Passengers",
    yourDetails: "Your details",
    nameLabel: "Full name",
    emailLabel: "Email",
    phoneLabel: "Phone (optional)",
    free: "Free",
    payNote:
      "Payment happens on {op}'s official website. We keep your reservation here so you can manage everything in one place.",
    continueBtn: "Continue",
    returnHeading: "Return boats",
    // Reservation page
    resTitle: "Your reservation",
    oneStepLeft: "One step left",
    step1: "Buy your tickets on {op}'s website — it opens in a new tab.",
    openSite: "Buy on {op}",
    step2: "Come back here and save your purchase reference to keep everything together.",
    refLabel: "Booking reference",
    refPlaceholder: "e.g. KT-12345",
    saveRef: "Save reference",
    cancelIntent: "Cancel this reservation",
    confirmedThanks: "All set! Show {op}'s confirmation when you board.",
    cancelledMsg: "This reservation is cancelled.",
    reference: "Reference",
    estTotal: "Estimated total",
    statusWord: "Status",
    statusINTENT: "Pending purchase",
    statusCONFIRMED: "Confirmed",
    statusCOMPLETED: "Completed",
    statusCANCELLED: "Cancelled",
    adults: "Adults",
    children: "Children",
    infants: "Infants",
    backHome: "← Back to schedules",
    navFind: "My bookings",
    findTitle: "Find your reservations",
    findIntro: "Enter your email and we'll send you links to your active reservations.",
    findSubmit: "Email me my bookings",
    findSent:
      "If there are reservations for that email, we've sent the links. Check your spam folder too.",
    sailingCancelledBanner:
      "The operator has cancelled this sailing (usually due to sea conditions). If you already bought tickets, contact the operator about rebooking or a refund under their policy.",
    findAnotherBoat: "Find another boat",
    scheduleDisclaimer:
      "Schedules and prices come from the operators' official websites (July 2026) and can change without notice. Always confirm when buying.",
  },
};

export type Dict = (typeof dictionaries)["es"];

export async function getDict(): Promise<{ locale: Locale; d: Dict }> {
  const locale = await getLocale();
  return { locale, d: dictionaries[locale] };
}

/** Replace the {op} placeholder used in operator-related strings. */
export function op(template: string, operatorName: string): string {
  return template.replaceAll("{op}", operatorName);
}
