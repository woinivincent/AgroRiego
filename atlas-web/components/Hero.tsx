import { SITE, WA_GENERIC } from "@/lib/site";

const layers = [
  { n: "01", label: "Interfaz", detail: "Next.js · React · TypeScript" },
  { n: "02", label: "Lógica", detail: "API · Autenticación" },
  { n: "03", label: "Datos", detail: "SQLite · PostgreSQL" },
  { n: "04", label: "Infraestructura", detail: "Deploy · Hosting · Dominio" },
];

const trust = [
  "Proyectos reales en producción",
  "Precios claros desde el inicio",
  "Todo queda a tu nombre",
];

function StackDiagram() {
  return (
    <div className="w-full max-w-[420px] justify-self-center" aria-label="Diagrama de capas de un sistema">
      {layers.map((l, i) => (
        <div
          key={l.n}
          className="mb-2 flex items-center justify-between gap-4 rounded-lg border border-line bg-panel px-4 py-3.5"
          style={{ opacity: 1 - i * 0.06 }}
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
              {l.n}
            </div>
            <div className="font-display text-[15px] font-semibold">{l.label}</div>
          </div>
          <div className="text-right font-mono text-[11px] text-blue">{l.detail}</div>
        </div>
      ))}
      <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
        cada capa, sostenida por la anterior
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="inicio" className="blueprint border-t border-line">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <div className="grid items-center gap-14 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="mb-5 font-mono text-xs uppercase tracking-[0.18em] text-blue">
              {SITE.domain} — desarrollo a medida
            </div>
            <h1 className="font-display text-[clamp(34px,5vw,52px)] font-extrabold leading-[1.08]">
              Desarrollo web y sistemas a medida para PyMEs y ONGs en Argentina
            </h1>
            <p className="mt-5 max-w-[600px] text-[19px] leading-relaxed text-mute">
              Tiendas online sin comisiones, portales de socios, sistemas de
              turnos y de gestión. Sin plantillas ni abonos de plataforma:
              software propio, hecho para cómo trabaja tu negocio.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <a
                href={WA_GENERIC}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-blue px-[26px] py-3.5 font-display font-semibold text-dark transition hover:bg-blue-hover"
              >
                💬 Consultar por WhatsApp
              </a>
              <a
                href="#servicios"
                className="rounded-lg border border-line px-[26px] py-3.5 font-display font-semibold text-ink transition hover:border-blue"
              >
                Ver servicios y precios
              </a>
            </div>
            <div className="mt-11 flex flex-wrap gap-x-7 gap-y-2.5 border-t border-dashed border-line pt-6">
              {trust.map((t) => (
                <span key={t} className="flex items-center gap-2 text-sm text-mute">
                  <span className="font-bold text-ok">✓</span> {t}
                </span>
              ))}
            </div>
          </div>
          <StackDiagram />
        </div>
      </div>
    </section>
  );
}
