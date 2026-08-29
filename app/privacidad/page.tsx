import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Política de privacidad — Tabarca Boats",
};

const UPDATED = "30 de agosto de 2026 / 30 August 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 mb-2 text-lg font-semibold text-slate-800">{children}</h2>;
}

export default async function PrivacyPage() {
  const { locale } = await getDict();

  if (locale === "en") {
    return (
      <article className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-700">
        <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-xs text-slate-500">Last updated: {UPDATED}</p>

        <H2>Who is responsible</H2>
        <p>
          The data controller is the operator of tabarcaboats.com (&ldquo;Tabarca
          Boats&rdquo;). Contact for anything privacy-related:{" "}
          <a className="text-sky-700" href="mailto:reservas@tabarcaboats.com">
            reservas@tabarcaboats.com
          </a>
          .
        </p>

        <H2>What data we process, and why</H2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Reservation data</strong> — name, email, optional phone, and your party
            details, so we can keep track of the trip you set up and show it back to you
            (legal basis: performance of our service at your request).
          </li>
          <li>
            <strong>Account data</strong> — if you choose to create an account (it is never
            required): your email and a password we store only as a cryptographic hash,
            never in plain text (legal basis: your consent; withdraw it by asking us to
            delete the account).
          </li>
          <li>
            <strong>Technical data</strong> — your IP address, used transiently to protect
            login and signup against abuse (rate limiting); it is held briefly in memory
            and not stored in our database (legal basis: legitimate interest in security).
          </li>
          <li>
            <strong>Emails</strong> — reservation confirmations, cancellation notices for
            sailings you hold a reservation on, and reservation links you request.
          </li>
        </ul>

        <H2>What we do NOT do</H2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            We never see or store <strong>payment data</strong>. Tickets are purchased on
            the boat operator&rsquo;s own website; payment happens entirely there.
          </li>
          <li>We do not send your personal data to the boat operators.</li>
          <li>We do not sell data, and we currently use no advertising or analytics trackers.</li>
        </ul>

        <H2>Cookies</H2>
        <p>
          Only functional cookies: your language preference (<code>lang</code>) and, if you
          log in, a session cookie (plus one for the site administrator). No third-party or
          advertising cookies.
        </p>

        <H2>Who we share data with</H2>
        <p>
          Our hosting and email provider is Hostinger (EU infrastructure), acting as a data
          processor. No transfers outside the EU are made by us.
        </p>

        <H2>Retention</H2>
        <p>
          Reservation records are kept while relevant to the service and any legal
          obligations; accounts are kept until you ask us to delete them.
        </p>

        <H2>Your rights</H2>
        <p>
          You can request access, rectification, erasure, restriction, portability, or
          object to processing by writing to the contact address above. You can also
          complain to the Spanish supervisory authority (AEPD, aepd.es).
        </p>

        <p className="mt-6">
          <Link href="/terminos" className="text-sky-700 hover:underline">
            Terms of use →
          </Link>
        </p>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-700">
      <h1 className="text-2xl font-bold text-slate-900">Política de privacidad</h1>
      <p className="mt-1 text-xs text-slate-500">Última actualización: {UPDATED}</p>

      <H2>Responsable del tratamiento</H2>
      <p>
        El responsable es el titular de tabarcaboats.com (&laquo;Tabarca Boats&raquo;).
        Contacto para cualquier cuestión de privacidad:{" "}
        <a className="text-sky-700" href="mailto:reservas@tabarcaboats.com">
          reservas@tabarcaboats.com
        </a>
        .
      </p>

      <H2>Qué datos tratamos y para qué</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Datos de reserva</strong> — nombre, email, teléfono opcional y los datos
          de tu grupo, para gestionar y mostrarte la reserva que preparas con nosotros
          (base legal: ejecución del servicio que solicitas).
        </li>
        <li>
          <strong>Datos de cuenta</strong> — si decides crear una cuenta (nunca es
          obligatoria): tu email y una contraseña que guardamos únicamente como hash
          criptográfico, nunca en claro (base legal: tu consentimiento; puedes retirarlo
          pidiendo la eliminación de la cuenta).
        </li>
        <li>
          <strong>Datos técnicos</strong> — tu dirección IP, usada de forma transitoria
          para proteger el acceso frente a abusos (límite de intentos); se mantiene
          brevemente en memoria y no se guarda en nuestra base de datos (base legal:
          interés legítimo en la seguridad).
        </li>
        <li>
          <strong>Emails</strong> — confirmaciones de reserva, avisos de cancelación de
          salidas en las que tengas reserva y enlaces de reserva que solicites.
        </li>
      </ul>

      <H2>Lo que NO hacemos</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Nunca vemos ni almacenamos <strong>datos de pago</strong>. Los billetes se
          compran en la web oficial de la naviera; el pago se realiza íntegramente allí.
        </li>
        <li>No enviamos tus datos personales a las navieras.</li>
        <li>No vendemos datos y actualmente no usamos rastreadores de publicidad ni analítica.</li>
      </ul>

      <H2>Cookies</H2>
      <p>
        Solo cookies funcionales: tu preferencia de idioma (<code>lang</code>) y, si
        inicias sesión, una cookie de sesión (más una para la administración del sitio).
        Sin cookies de terceros ni publicitarias.
      </p>

      <H2>Destinatarios</H2>
      <p>
        Nuestro proveedor de alojamiento y correo es Hostinger (infraestructura en la UE),
        que actúa como encargado del tratamiento. No realizamos transferencias fuera de la
        UE.
      </p>

      <H2>Conservación</H2>
      <p>
        Los registros de reserva se conservan mientras sean relevantes para el servicio y
        las obligaciones legales; las cuentas, hasta que solicites su eliminación.
      </p>

      <H2>Tus derechos</H2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, limitación,
        portabilidad y oposición escribiendo al contacto indicado. También puedes reclamar
        ante la AEPD (aepd.es).
      </p>

      <p className="mt-6">
        <Link href="/terminos" className="text-sky-700 hover:underline">
          Términos de uso →
        </Link>
      </p>
    </article>
  );
}
