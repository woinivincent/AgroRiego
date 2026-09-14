import { obtenerConfiguracion } from "@/lib/consultas";
import { FormularioConfiguracion } from "@/components/FormularioConfiguracion";
import { EncabezadoPagina } from "@/components/Ui";
import { EFICIENCIA_METODO, AGUA_UTIL_MM_POR_M } from "@/lib/agronomia";

export const dynamic = "force-dynamic";

export default async function PaginaConfiguracion() {
  const configuracion = await obtenerConfiguracion();

  return (
    <>
      <EncabezadoPagina
        titulo="Configuración"
        descripcion="Parámetros de la explotación que usan la calculadora y el costeo."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="tarjeta">
          <FormularioConfiguracion configuracion={configuracion} />
        </div>

        <div className="tarjeta">
          <h2 className="mb-1 text-lg font-semibold">Valores de referencia</h2>
          <p className="texto-suave mb-4 text-sm">
            Tablas que usa la calculadora. Son aproximaciones de FAO-56: si tenés datos de tu zona
            o de tu sistema, conviene ajustarlas en{" "}
            <code className="text-xs">src/lib/agronomia.ts</code>.
          </p>

          <h3 className="mb-2 text-sm font-semibold">Eficiencia por método de riego</h3>
          <ul className="texto-suave mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {Object.entries(EFICIENCIA_METODO).map(([metodo, valor]) => (
              <li key={metodo}>
                {metodo}: <strong>{Math.round(valor * 100)}%</strong>
              </li>
            ))}
          </ul>

          <h3 className="mb-2 text-sm font-semibold">Agua útil del suelo (mm por metro)</h3>
          <ul className="texto-suave grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {Object.entries(AGUA_UTIL_MM_POR_M).map(([suelo, valor]) => (
              <li key={suelo}>
                {suelo}: <strong>{valor} mm/m</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
