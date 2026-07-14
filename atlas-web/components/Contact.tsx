import { SITE, WA_GENERIC } from "@/lib/site";

export default function Contact() {
  return (
    <section id="contacto" className="blueprint border-t border-line bg-bgalt">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="font-display text-[clamp(28px,5vw,42px)] font-extrabold leading-[1.15]">
            Contame qué necesita tu negocio
          </h2>
          <p className="mt-4 text-[17px] text-mute">
            La primera consulta no tiene costo ni compromiso. Me contás tu
            situación y te digo con honestidad qué te conviene, aunque no sea
            contratarme.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <a
              href={WA_GENERIC}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-blue px-[26px] py-3.5 font-display font-semibold text-dark transition hover:bg-blue-hover"
            >
              💬 Escribir por WhatsApp
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="rounded-lg border border-line px-[26px] py-3.5 font-display font-semibold text-ink transition hover:border-blue"
            >
              {SITE.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
