import {
  Building2,
  CalendarCheck,
  Globe,
  LayoutDashboard,
  ShoppingCart,
  Users,
} from "lucide-react";
import Plate from "./Plate";
import { waLink } from "@/lib/site";

const services = [
  {
    icon: Globe,
    name: "Landing page profesional",
    audience: "Para presentar tu negocio y captar consultas.",
    price: "desde USD 300",
    features: [
      "Diseño a medida (sin plantillas)",
      "Optimizada para Google y celulares",
      "Formulario + botón de WhatsApp",
      "Entrega en 1–2 semanas",
    ],
    wa: "Hola Atlas, quiero un presupuesto por una landing page",
  },
  {
    icon: Building2,
    name: "Sitio institucional",
    audience: "Para empresas y organizaciones que necesitan presencia seria.",
    price: "desde USD 650",
    features: [
      "Hasta 8 secciones",
      "Autogestión de contenido",
      "SEO técnico incluido",
      "Correo y dominio configurados",
    ],
    wa: "Hola Atlas, quiero un presupuesto por un sitio institucional",
  },
  {
    icon: ShoppingCart,
    name: "Tienda online a medida",
    audience: "Para vender sin pagar comisiones por cada venta.",
    price: "desde USD 1.200",
    features: [
      "Catálogo y carrito propios",
      "Pagos con Mercado Pago",
      "Sin abonos de plataforma",
      "Panel de pedidos y stock",
    ],
    wa: "Hola Atlas, quiero un presupuesto por una tienda online",
  },
  {
    icon: CalendarCheck,
    name: "Sistema de turnos",
    audience: "Para profesionales que agendan por WhatsApp a mano.",
    price: "desde USD 800",
    features: [
      "Agenda online 24/7",
      "Recordatorios automáticos",
      "Cobro de seña integrado",
      "Integrado a tu web",
    ],
    wa: "Hola Atlas, quiero un presupuesto por un sistema de turnos",
  },
  {
    icon: Users,
    name: "Portal de socios",
    audience: "Para clubes y ONGs que gestionan padrones en planillas.",
    price: "desde USD 1.400",
    features: [
      "Alta y cobro de cuotas",
      "Credenciales con QR",
      "Panel de administración con roles",
      "Reportes exportables",
    ],
    wa: "Hola Atlas, quiero un presupuesto por un portal de socios",
  },
  {
    icon: LayoutDashboard,
    name: "Sistema de gestión",
    audience: "Para negocios que ya no entran en un Excel.",
    price: "desde USD 2.200",
    features: [
      "Ventas, stock y caja",
      "Funciona sin internet (escritorio)",
      "Exportación a Excel y PDF",
      "Hecho para tu operación real",
    ],
    wa: "Hola Atlas, quiero un presupuesto por un sistema de gestión",
  },
];

export default function Services() {
  return (
    <section id="servicios" className="blueprint border-t border-line bg-bgalt">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <Plate
          code="Lámina 03 — Servicios"
          title="Servicios y precios, sin vueltas"
          lead="Precios de referencia en USD (abonás en pesos al cambio del día). El presupuesto final depende del alcance y te lo doy por escrito antes de empezar."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.name}
              className="flex flex-col gap-3.5 rounded-[10px] border border-line bg-panel p-7 transition hover:-translate-y-0.5 hover:border-blue"
            >
              <div className="flex items-center justify-between">
                <s.icon size={22} className="text-blue" />
                <span className="whitespace-nowrap rounded-md bg-blue-soft px-2.5 py-1 font-mono text-[13px] text-blue">
                  {s.price}
                </span>
              </div>
              <div>
                <h3 className="font-display text-[19px] font-semibold">{s.name}</h3>
                <p className="mt-1.5 text-sm text-mute">{s.audience}</p>
              </div>
              <ul className="grid gap-2">
                {s.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm leading-normal">
                    <span className="shrink-0 font-bold text-ok">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href={waLink(s.wa)}
                target="_blank"
                rel="noreferrer"
                className="mt-auto pt-1 font-display text-sm font-semibold text-blue hover:underline"
              >
                Pedir presupuesto →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
