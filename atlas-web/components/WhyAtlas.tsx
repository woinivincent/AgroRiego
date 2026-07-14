import { Boxes, Layers, ShieldCheck, Wrench } from "lucide-react";
import Plate from "./Plate";

const reasons = [
  {
    icon: Boxes,
    title: "Un solo interlocutor",
    text: "Del relevamiento al deploy, hablás siempre con quien programa. Sin intermediarios ni cadenas de tercerización.",
  },
  {
    icon: Layers,
    title: "Stack moderno y mantenible",
    text: "Next.js, TypeScript y bases de datos livianas o robustas según el caso. Código que se puede sostener en el tiempo.",
  },
  {
    icon: Wrench,
    title: "Pensado para PyMEs y ONGs",
    text: "Presupuestos claros, ajustados a la escala real del proyecto. Sin vueltas ni letra chica.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad desde el diseño",
    text: "Autenticación robusta, buenas prácticas de manejo de datos y criterio de hardening desde el primer commit.",
  },
];

export default function WhyAtlas() {
  return (
    <section className="blueprint border-t border-line">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <Plate
          code="Lámina 02 — Por qué Atlas"
          title="Cuatro razones por las que los proyectos no se caen a mitad de camino"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r) => (
            <div key={r.title} className="rounded-[10px] border border-line bg-panel p-7">
              <r.icon size={22} className="text-blue" />
              <h3 className="mt-4 font-display text-[17px] font-semibold">{r.title}</h3>
              <p className="mt-2.5 text-sm text-mute">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
