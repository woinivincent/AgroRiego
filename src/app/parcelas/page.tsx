import Link from "next/link";
import { eliminarParcela } from "@/lib/acciones";
import { obtenerParcelasConEstado } from "@/lib/consultas";
import { formatearFecha, formatearLitros, formatearNumero } from "@/lib/formato";
import { BotonEnvio } from "@/components/BotonEnvio";
import { NuevaParcela } from "@/components/NuevaParcela";
import { EncabezadoPagina, EstadoVacio } from "@/components/Ui";

export const dynamic = "force-dynamic";

export default async function PaginaParcelas() {
  const parcelas = await obtenerParcelasConEstado();

  return (
    <>
      <EncabezadoPagina
        titulo="Parcelas"
        descripcion="Lotes, cultivos y configuración del sistema de riego."
        accion={parcelas.length > 0 ? <NuevaParcela /> : undefined}
      />

      {parcelas.length === 0 ? (
        <NuevaParcela abiertoPorDefecto />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {parcelas.map((parcela) => (
            <li key={parcela.id} className="tarjeta flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{parcela.nombre}</h2>
                  <p className="texto-suave text-sm">
                    {parcela.cultivo} · {formatearNumero(parcela.superficieHa)} ha
                  </p>
                </div>
                <span
                  className={`insignia ${
                    !parcela.activa
                      ? "bg-neutral-500/15 text-neutral-500"
                      : parcela.estado.necesitaRiego
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-campo-500/15 text-campo-700"
                  }`}
                >
                  {!parcela.activa
                    ? "Inactiva"
                    : parcela.estado.necesitaRiego
                      ? "Necesita riego"
                      : `Riega en ${parcela.estado.diasParaProximoRiego} día(s)`}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="texto-suave text-xs">Suelo</dt>
                  <dd>{parcela.tipoSuelo}</dd>
                </div>
                <div>
                  <dt className="texto-suave text-xs">Método</dt>
                  <dd>{parcela.metodoRiego}</dd>
                </div>
                <div>
                  <dt className="texto-suave text-xs">Caudal</dt>
                  <dd>{formatearNumero(parcela.caudalLh, 0)} L/h</dd>
                </div>
                <div>
                  <dt className="texto-suave text-xs">Frecuencia</dt>
                  <dd>Cada {parcela.frecuenciaDias} día(s)</dd>
                </div>
                <div>
                  <dt className="texto-suave text-xs">Último riego</dt>
                  <dd>{parcela.ultimoRiego ? formatearFecha(parcela.ultimoRiego) : "—"}</dd>
                </div>
                <div>
                  <dt className="texto-suave text-xs">Agua acumulada</dt>
                  <dd>
                    {formatearLitros(parcela.litrosTotales)}
                    <span className="texto-suave"> · {parcela.riegosCompletados} riego(s)</span>
                  </dd>
                </div>
              </dl>

              {parcela.notas && <p className="texto-suave text-sm italic">{parcela.notas}</p>}

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                <Link href={`/riegos?parcela=${parcela.id}`} className="boton-agua">
                  Programar riego
                </Link>
                <Link href={`/parcelas/${parcela.id}/editar`} className="boton-secundario">
                  Editar
                </Link>
                <form action={eliminarParcela} className="ml-auto">
                  <input type="hidden" name="id" value={parcela.id} />
                  <BotonEnvio className="boton-texto" textoPendiente="…">
                    Eliminar
                  </BotonEnvio>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
