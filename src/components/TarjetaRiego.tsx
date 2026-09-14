import { cancelarRiego, completarRiego, eliminarRiego } from "@/lib/acciones";
import type { RiegoConParcela } from "@/lib/consultas";
import { formatearDuracion, formatearFechaHora, formatearLitros } from "@/lib/formato";
import { litrosEstimados } from "@/lib/riego";
import { BotonEnvio } from "@/components/BotonEnvio";
import { InsigniaEstado } from "@/components/Ui";

export function TarjetaRiego({
  riego,
  atrasado = false,
  conAcciones = true,
}: {
  riego: RiegoConParcela;
  atrasado?: boolean;
  conAcciones?: boolean;
}) {
  const estimado = litrosEstimados(riego.parcela.caudalLh, riego.duracionMin);

  return (
    <li
      className="tarjeta flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      style={atrasado ? { borderColor: "var(--color-tierra-500)" } : undefined}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{riego.parcela.nombre}</span>
          <InsigniaEstado estado={riego.estado} />
          {atrasado && <span className="insignia bg-amber-500/15 text-amber-600">Atrasado</span>}
        </div>
        <p className="texto-suave mt-1 text-sm">
          {formatearFechaHora(riego.fechaHora)} · {formatearDuracion(riego.duracionMin)} ·{" "}
          {riego.estado === "COMPLETADO"
            ? formatearLitros(riego.litros ?? 0)
            : `≈ ${formatearLitros(estimado)}`}
        </p>
        {riego.notas && <p className="texto-suave mt-1 text-sm italic">{riego.notas}</p>}
      </div>

      {conAcciones && (
        <div className="flex flex-wrap items-end gap-2 sm:justify-end">
          {riego.estado === "PROGRAMADO" && (
            <>
              <form action={completarRiego} className="flex items-end gap-2">
                <input type="hidden" name="id" value={riego.id} />
                <div>
                  <label className="etiqueta mb-0.5 text-xs" htmlFor={`litros-${riego.id}`}>
                    Litros aplicados
                  </label>
                  <input
                    id={`litros-${riego.id}`}
                    name="litros"
                    type="number"
                    min="0"
                    step="1"
                    className="campo w-24"
                    defaultValue={estimado}
                  />
                </div>
                <BotonEnvio className="boton-primario" textoPendiente="…">
                  Marcar regado
                </BotonEnvio>
              </form>
              <form action={cancelarRiego}>
                <input type="hidden" name="id" value={riego.id} />
                <BotonEnvio className="boton-secundario" textoPendiente="…">
                  Cancelar
                </BotonEnvio>
              </form>
            </>
          )}
          <form action={eliminarRiego}>
            <input type="hidden" name="id" value={riego.id} />
            <BotonEnvio className="boton-texto" textoPendiente="…">
              Eliminar
            </BotonEnvio>
          </form>
        </div>
      )}
    </li>
  );
}
