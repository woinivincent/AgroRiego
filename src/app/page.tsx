import Link from "next/link";
import { obtenerResumen } from "@/lib/consultas";
import { formatearFecha, formatearLitros, formatearNumero } from "@/lib/formato";
import { TarjetaRiego } from "@/components/TarjetaRiego";
import { EncabezadoPagina, EstadoVacio, Metrica } from "@/components/Ui";

export const dynamic = "force-dynamic";

export default async function PaginaPanel() {
  const resumen = await obtenerResumen();

  return (
    <>
      <EncabezadoPagina
        titulo="Panel"
        descripcion="Estado del riego de tus parcelas de un vistazo."
        accion={
          <Link href="/riegos" className="boton-agua">
            + Programar riego
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          titulo="Parcelas activas"
          valor={String(resumen.parcelasActivas)}
          detalle={`${formatearNumero(resumen.superficieTotal)} ha en producción`}
          icono="🌱"
        />
        <Metrica
          titulo="Riegos de la semana"
          valor={String(resumen.riegosSemana)}
          detalle={`${resumen.riegosCompletadosSemana} ya completados`}
          icono="📅"
        />
        <Metrica
          titulo="Agua de la semana"
          valor={formatearLitros(resumen.litrosSemana)}
          detalle={`${formatearLitros(resumen.litrosMes)} en el mes`}
          icono="💧"
        />
        <Metrica
          titulo="Necesitan riego"
          valor={String(resumen.pendientes.length)}
          detalle={
            resumen.riegosAtrasados.length > 0
              ? `${resumen.riegosAtrasados.length} riego(s) atrasados`
              : "Sin riegos atrasados"
          }
          icono="⚠️"
        />
      </section>

      {resumen.parcelas.length === 0 && (
        <section className="mt-8">
          <EstadoVacio
            titulo="Todavía no hay parcelas cargadas"
            descripcion="Creá tu primera parcela para empezar a programar riegos y llevar el registro del agua aplicada."
          />
          <div className="mt-4 text-center">
            <Link href="/parcelas" className="boton-primario">
              Crear la primera parcela
            </Link>
          </div>
        </section>
      )}

      {resumen.riegosAtrasados.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Riegos atrasados</h2>
          <ul className="grid gap-3">
            {resumen.riegosAtrasados.map((riego) => (
              <TarjetaRiego key={riego.id} riego={riego} atrasado />
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Parcelas que necesitan riego</h2>
            <Link href="/parcelas" className="texto-suave text-sm hover:underline">
              Ver todas
            </Link>
          </div>
          {resumen.pendientes.length === 0 ? (
            <EstadoVacio
              titulo="Todo al día"
              descripcion="Ninguna parcela activa superó su frecuencia de riego."
            />
          ) : (
            <ul className="grid gap-3">
              {resumen.pendientes.map((parcela) => (
                <li key={parcela.id} className="tarjeta">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{parcela.nombre}</span>
                    <span
                      className={`insignia ${
                        parcela.estado.urgente
                          ? "bg-red-500/15 text-red-600"
                          : "bg-amber-500/15 text-amber-600"
                      }`}
                    >
                      {parcela.estado.diasDesdeUltimoRiego === null
                        ? "Sin riegos registrados"
                        : `Hace ${parcela.estado.diasDesdeUltimoRiego} día(s)`}
                    </span>
                  </div>
                  <p className="texto-suave mt-1 text-sm">
                    {parcela.cultivo} · {formatearNumero(parcela.superficieHa)} ha · riega cada{" "}
                    {parcela.frecuenciaDias} día(s)
                    {parcela.ultimoRiego && ` · último: ${formatearFecha(parcela.ultimoRiego)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Próximos riegos</h2>
            <Link href="/riegos" className="texto-suave text-sm hover:underline">
              Ver todos
            </Link>
          </div>
          {resumen.proximosRiegos.length === 0 ? (
            <EstadoVacio
              titulo="No hay riegos programados"
              descripcion="Programá el próximo riego desde la sección Riegos."
            />
          ) : (
            <ul className="grid gap-3">
              {resumen.proximosRiegos.map((riego) => (
                <TarjetaRiego key={riego.id} riego={riego} conAcciones={false} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
