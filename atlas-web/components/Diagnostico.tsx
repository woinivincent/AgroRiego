import Plate from "./Plate";

const pains = [
  {
    title: "Vendés por mensajes directos",
    text: "Cada venta son veinte mensajes: precio, stock, datos, comprobante. Una tienda propia cobra y registra sola, sin comisiones por venta.",
  },
  {
    title: "Gestionás socios en planillas",
    text: "Altas, bajas y cuotas a mano, y nadie sabe cuál es la versión buena del Excel. Un portal de socios ordena el padrón y cobra por vos.",
  },
  {
    title: "Agendás turnos por WhatsApp",
    text: "Tu agenda vive en el chat y las ausencias no avisan. Un sistema de turnos agenda 24/7 y manda recordatorios automáticos.",
  },
];

export default function Diagnostico() {
  return (
    <section className="blueprint border-t border-line bg-bgalt">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <Plate
          code="Lámina 01 — Diagnóstico"
          title="¿Te suena alguna de estas?"
          lead="Los sistemas a medida no son para empresas gigantes. Son para resolver estos problemas concretos."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {pains.map((p) => (
            <div key={p.title} className="rounded-[10px] border border-line bg-panel p-7">
              <h3 className="font-display text-[19px] font-semibold">{p.title}</h3>
              <p className="mt-3 text-sm text-mute">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
