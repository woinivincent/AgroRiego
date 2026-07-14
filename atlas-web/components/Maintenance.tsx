import { ShieldCheck } from "lucide-react";
import Plate from "./Plate";

const plans = [
  {
    name: "Esencial",
    price: "USD 30/mes",
    tagline: "Tu sitio, siempre en línea.",
    features: [
      "Monitoreo de disponibilidad",
      "Actualizaciones de seguridad",
      "Copias de respaldo mensuales",
      "Soporte por WhatsApp (48 h)",
    ],
  },
  {
    name: "Protegido",
    price: "USD 90/mes",
    tagline: "Para sitios que no pueden fallar.",
    featured: true,
    features: [
      "Todo lo de Esencial",
      "Copias de respaldo semanales",
      "Revisión de seguridad mensual",
      "Cambios menores incluidos",
      "Informe mensual de estado",
      "Soporte prioritario (24 h)",
    ],
  },
  {
    name: "Enterprise",
    price: "a medida",
    tagline: "Sistemas críticos y a gran escala.",
    features: [
      "Acuerdo de disponibilidad (SLA)",
      "Monitoreo avanzado",
      "Respuesta ante incidentes",
      "Auditorías de seguridad periódicas",
    ],
  },
];

export default function Maintenance() {
  return (
    <section id="mantenimiento" className="blueprint border-t border-line bg-bgalt">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <Plate
          code="Lámina 07 — Seguridad y mantenimiento"
          title="Tu sistema no se termina el día de la entrega"
          lead="Un sitio sin mantenimiento se rompe, se desactualiza o lo hackean. Estos planes lo mantienen seguro y en línea para que vos te ocupes de tu negocio."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col gap-3.5 rounded-[10px] border bg-panel p-7 ${
                p.featured ? "border-blue" : "border-line"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-[11px] left-6 rounded bg-blue px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-dark">
                  Más elegido
                </span>
              )}
              <h3 className="flex items-center gap-2 font-display text-[19px] font-semibold">
                <ShieldCheck size={18} className="text-blue" /> {p.name}
              </h3>
              <div className="font-mono text-[15px] text-blue">{p.price}</div>
              <p className="text-sm text-mute">{p.tagline}</p>
              <ul className="grid gap-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm leading-normal">
                    <span className="shrink-0 font-bold text-ok">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
