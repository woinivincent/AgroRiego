export default function About() {
  return (
    <section className="blueprint border-t border-line bg-bgalt">
      <div className="mx-auto max-w-[1120px] px-6 py-[88px]">
        <div className="grid items-center gap-11 md:grid-cols-2">
          <div>
            <div className="mb-3.5 font-mono text-xs uppercase tracking-[0.18em] text-blue">
              Lámina 05 — Responsable de obra
            </div>
            <h2 className="font-display text-[clamp(26px,4vw,38px)] font-bold leading-[1.15]">
              Quién está detrás de Atlas
            </h2>
            <p className="mt-4 text-base leading-relaxed text-mute">
              Soy Vicente, desarrollador full-stack y fundador de Atlas. Trabajo
              con tecnologías modernas (Next.js, TypeScript, React) y me
              especializo en traducir la operación real de un negocio a un
              sistema que la simplifique.
            </p>
            <p className="mt-4 text-base leading-relaxed text-mute">
              Trabajás directo conmigo, de la primera reunión a la entrega: sin
              intermediarios, sin que el proyecto pase de mano en mano. Y además
              me formo en ciberseguridad, así que la seguridad de tu sitio no es
              un extra: es parte del diseño desde el día uno.
            </p>
          </div>
          <div
            role="img"
            aria-label="Espacio reservado para foto profesional"
            className="flex aspect-[4/5] w-full max-w-[340px] items-center justify-center justify-self-center rounded-[10px] border border-dashed border-line bg-panel font-mono text-xs tracking-[0.1em] text-mute"
          >
            [ TU FOTO PROFESIONAL ACÁ ]
          </div>
        </div>
      </div>
    </section>
  );
}
