import Plate from "./Plate";

const steps = [
  {
    n: "01",
    title: "Relevamiento",
    text: "Una llamada o chat para entender tu negocio y el problema real. Sin compromiso.",
  },
  {
    n: "02",
    title: "Propuesta por escrito",
    text: "Alcance, precio cerrado y plazo concreto. Sabés exactamente qué recibís.",
  },
  {
    n: "03",
    title: "Desarrollo con avances",
    text: "Ves el proyecto crecer con entregas parciales y feedback constante. Nada de desaparecer dos meses.",
  },
  {
    n: "04",
    title: "Entrega y capacitación",
    text: "Puesta en producción con dominio y hosting configurados. Todo queda a tu nombre.",
  },
  {
    n: "05",
    title: "Soporte post-lanzamiento",
    text: "Ajustes, mantenimiento y evolución del sistema en el tiempo, si querés que siga cuidándolo.",
  },
];

export default function Process() {
  return (
    <section className="blueprint border-t border-line">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <Plate
          code="Lámina 06 — Método"
          title="Cómo trabajamos"
          lead="Un proceso en cinco etapas, en orden. Sabés qué pasa en cada una y qué recibís al final."
        />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s) => (
            <li key={s.n} className="rounded-[10px] border border-line bg-panel p-7">
              <div className="mb-3 font-mono text-[13px] text-blue">{s.n}</div>
              <h3 className="font-display text-[17px] font-semibold">{s.title}</h3>
              <p className="mt-2.5 text-sm text-mute">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
