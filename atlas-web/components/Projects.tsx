import Plate from "./Plate";

const cases = [
  {
    type: "Portal de socios · ONG",
    name: "Campo Escuela Flandes",
    text: "El padrón de socios pasó de planillas manuales a un portal con credenciales QR y panel de administración de doble rol. La gestión que llevaba horas por semana hoy se resuelve en minutos.",
  },
  {
    type: "Sitio institucional · Industria",
    name: "Nasello Cables",
    text: "Sitio rápido y estable en su propio hosting, con recepción de consultas y listas de precios exportables a Excel. La empresa dejó de depender de terceros para actualizar su presencia online.",
  },
  {
    type: "Portal institucional · ONG",
    name: "Asociación Civil Luján",
    text: "Portal con área de socios y autenticación propia. Los miembros acceden a su información sin llamados ni correos, y la comisión administra todo desde un solo lugar.",
  },
  {
    type: "Punto de venta · Comercio",
    name: "Nueva Siembra",
    text: "Sistema de escritorio de ventas y stock que funciona aunque se corte internet, con cierres de caja y reportes en Excel y PDF. El control del negocio dejó de depender de anotaciones a mano.",
  },
];

export default function Projects() {
  return (
    <section id="proyectos" className="blueprint border-t border-line">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <Plate
          code="Lámina 04 — Obra ejecutada"
          title="Proyectos reales, funcionando hoy"
          lead="No son maquetas de portfolio: son sistemas en producción que clientes usan todos los días."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {cases.map((c) => (
            <article
              key={c.name}
              className="rounded-[10px] border border-l-[3px] border-line border-l-blue bg-panel p-7"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue">
                {c.type}
              </div>
              <h3 className="mt-3 font-display text-[19px] font-semibold">{c.name}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-mute">{c.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
