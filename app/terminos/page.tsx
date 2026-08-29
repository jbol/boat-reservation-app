import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Términos de uso — Tabarca Boats",
};

const UPDATED = "30 de agosto de 2026 / 30 August 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 mb-2 text-lg font-semibold text-slate-800">{children}</h2>;
}

export default async function TermsPage() {
  const { locale } = await getDict();

  if (locale === "en") {
    return (
      <article className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-700">
        <h1 className="text-2xl font-bold text-slate-900">Terms of Use</h1>
        <p className="mt-1 text-xs text-slate-500">Last updated: {UPDATED}</p>

        <H2>What Tabarca Boats is</H2>
        <p>
          tabarcaboats.com is an independent information and comparison service for
          passenger boats to Isla de Tabarca. We aggregate the operators&rsquo; published
          schedules and prices and help you keep track of your trip in one place. We are
          not a boat operator, carrier, or travel agency, and we are not affiliated with
          the operators listed.
        </p>

        <H2>Bookings and payment happen with the operator</H2>
        <p>
          When you &ldquo;book&rdquo; here, we save your trip details and hand you off to
          the boat operator&rsquo;s official website, where the actual purchase and payment
          take place. The transport contract is exclusively between you and the operator,
          under the operator&rsquo;s own conditions (including changes, cancellations and
          refunds).
        </p>

        <H2>Schedule accuracy</H2>
        <p>
          Schedules and prices are transcribed from the operators&rsquo; official websites
          and re-verified regularly — each listing shows when it was last verified. They
          can nevertheless change without notice (weather cancellations are common on this
          crossing), so always confirm with the operator before travelling. We accept no
          liability for changes, cancellations, or errors in published times.
        </p>

        <H2>Accounts</H2>
        <p>
          Accounts are optional. You are responsible for keeping your password safe. We may
          suspend accounts used abusively. You can ask us to delete your account at any
          time.
        </p>

        <H2>Acceptable use</H2>
        <p>
          Don&rsquo;t abuse the service: no scraping at disruptive volume, no attempts to
          breach security, no fraudulent reservations.
        </p>

        <H2>Liability</H2>
        <p>
          The service is provided &ldquo;as is&rdquo;, free of charge. To the extent
          permitted by law, our liability is limited to that of an information
          intermediary; we are never liable for the transport service itself.
        </p>

        <H2>Law and contact</H2>
        <p>
          Spanish law applies. Contact:{" "}
          <a className="text-sky-700" href="mailto:reservas@tabarcaboats.com">
            reservas@tabarcaboats.com
          </a>
          . See also our{" "}
          <Link href="/privacidad" className="text-sky-700 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-700">
      <h1 className="text-2xl font-bold text-slate-900">Términos de uso</h1>
      <p className="mt-1 text-xs text-slate-500">Última actualización: {UPDATED}</p>

      <H2>Qué es Tabarca Boats</H2>
      <p>
        tabarcaboats.com es un servicio independiente de información y comparación de
        barcos de pasajeros a la Isla de Tabarca. Agregamos los horarios y precios
        publicados por las navieras y te ayudamos a tener tu viaje organizado en un solo
        lugar. No somos naviera, transportista ni agencia de viajes, y no estamos
        afiliados a las navieras listadas.
      </p>

      <H2>La reserva y el pago se hacen con la naviera</H2>
      <p>
        Al &laquo;reservar&raquo; aquí guardamos los datos de tu viaje y te dirigimos a la
        web oficial de la naviera, donde se realiza la compra y el pago. El contrato de
        transporte es exclusivamente entre tú y la naviera, con sus propias condiciones
        (cambios, cancelaciones y reembolsos incluidos).
      </p>

      <H2>Exactitud de los horarios</H2>
      <p>
        Los horarios y precios se transcriben de las webs oficiales de las navieras y se
        reverifican con regularidad — cada listado muestra cuándo se verificó por última
        vez. Aun así pueden cambiar sin previo aviso (las cancelaciones por mal tiempo son
        habituales en esta travesía), así que confirma siempre con la naviera antes de
        viajar. No asumimos responsabilidad por cambios, cancelaciones o errores en los
        horarios publicados.
      </p>

      <H2>Cuentas</H2>
      <p>
        Las cuentas son opcionales. Eres responsable de custodiar tu contraseña. Podemos
        suspender cuentas usadas de forma abusiva. Puedes pedir la eliminación de tu
        cuenta en cualquier momento.
      </p>

      <H2>Uso aceptable</H2>
      <p>
        No abuses del servicio: nada de scraping a volumen disruptivo, intentos de vulnerar
        la seguridad ni reservas fraudulentas.
      </p>

      <H2>Responsabilidad</H2>
      <p>
        El servicio se presta &laquo;tal cual&raquo; y de forma gratuita. En la medida que
        permita la ley, nuestra responsabilidad se limita a la de un intermediario de
        información; nunca respondemos del servicio de transporte en sí.
      </p>

      <H2>Ley aplicable y contacto</H2>
      <p>
        Se aplica la ley española. Contacto:{" "}
        <a className="text-sky-700" href="mailto:reservas@tabarcaboats.com">
          reservas@tabarcaboats.com
        </a>
        . Consulta también nuestra{" "}
        <Link href="/privacidad" className="text-sky-700 hover:underline">
          política de privacidad
        </Link>
        .
      </p>
    </article>
  );
}
