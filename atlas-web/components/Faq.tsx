"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const items = [
  {
    q: "¿Por qué contratar un desarrollo a medida en vez de Tienda Nube o Shopify?",
    a: "Las plataformas cobran abono mensual y comisiones por venta, y te limitan a lo que su plantilla permite. Un desarrollo propio es tuyo: sin comisiones, adaptado a cómo trabaja tu negocio, y crece con vos. En muchos casos el costo total al año o dos ya es menor.",
  },
  {
    q: "¿Cuánto tarda un proyecto?",
    a: "Una landing, 1 a 2 semanas. Un sitio institucional, 2 a 4. Tiendas y sistemas, entre 4 y 8 según el alcance. Antes de empezar te doy un plazo concreto por escrito y vas viendo avances durante el desarrollo.",
  },
  {
    q: "¿Cómo se paga?",
    a: "50% para iniciar y 50% contra entrega. En proyectos grandes se puede dividir por etapas. Los precios se expresan en USD porque hosting, dominios y herramientas se pagan en divisa, pero abonás en pesos al cambio del día.",
  },
  {
    q: "¿Qué pasa si el proyecto cambia sobre la marcha?",
    a: "El alcance se cierra por escrito antes de arrancar. Si surge algo nuevo durante el desarrollo, se cotiza aparte — así el precio original nunca se pisa y vos decidís qué se suma.",
  },
  {
    q: "¿Qué pasa después de la entrega?",
    a: "El proyecto queda a tu nombre: dominio, hosting y código. Podés seguir por tu cuenta o contratar un plan de mantenimiento para que yo me ocupe de seguridad, respaldos y cambios.",
  },
  {
    q: "¿Trabajás con clientes de cualquier parte del país?",
    a: "Sí. Todo el proceso es remoto: reuniones por videollamada, avances por WhatsApp y entregas online. Ya trabajé con comercios, ONGs e industrias de distintas provincias.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="blueprint border-t border-line">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <header className="mb-12">
          <div className="mb-3.5 font-mono text-xs uppercase tracking-[0.18em] text-blue">
            Lámina 08 — Consultas frecuentes
          </div>
          <h2 className="max-w-[640px] font-display text-[clamp(26px,4vw,38px)] font-bold leading-[1.15]">
            Preguntas antes de contratar
          </h2>
        </header>
        <div className="max-w-[760px]">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-line">
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-1 py-5 text-left font-display text-base font-semibold text-ink"
                >
                  {item.q}
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-blue transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mx-1 mb-5 max-w-[680px] text-[15px] leading-relaxed text-mute">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
