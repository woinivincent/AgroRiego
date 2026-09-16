import Link from "next/link";
import { obtenerConfiguracion, obtenerHistorial, obtenerParcelas } from "@/lib/consultas";
import { costoAplicacion } from "@/lib/agronomia";
import { formatearDuracion, formatearFechaHora, formatearLitros, formatearNumero } from "@/lib/formato";
import { laminaMm } from "@/lib/riego";
import { EncabezadoPagina, EstadoVacio, InsigniaEstado, Metrica } from "@/components/Ui";

export const dynamic = "force-dynamic";

export default async function PaginaHistorial({
  searchParams,
}: {
  searchParams: Promise<{ parcela?: string }>;
}) {
  const [{ parcela: parcelaId }, parcelas, configuracion] = await Promise.all([
    searchParams,
    obtenerParcelas(),
    obtenerConfiguracion(),
  ]);
  const filtro = parcelas.some((parcela) => parcela.id === parcelaId) ? parcelaId : undefined;
  const riegos = await obtenerHistorial(filtro);

  const completados = riegos.filter((riego) => riego.estado === "COMPLETADO");
  const litrosTotales = completados.reduce((total, riego) => total + (riego.litros ?? 0), 0);
  const minutosTotales = completados.reduce((total, riego) => total + riego.duracionMin, 0);

  const costoDe = (riego: (typeof riegos)[number]) =>
    costoAplicacion({
      litros: riego.litros ?? 0,
      minutos: riego.duracionMin,
      potenciaBombaKw: riego.parcela.potenciaBombaKw,
      precioKwh: configuracion.precioKwh,
      precioAguaM3: configuracion.precioAguaM3,
    }).total;

  const costoTotal = completados.reduce((total, riego) => total + costoDe(riego), 0);
  const formatearMoneda = (valor: number) =>
    valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  return (
    <>
      <EncabezadoPagina
        titulo="Historial"
        descripcion="Riegos ejecutados y agua aplicada por parcela."
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica titulo="Riegos completados" valor={String(completados.length)} icono="✅" />
        <Metrica titulo="Agua aplicada" valor={formatearLitros(litrosTotales)} icono="💧" />
        <Metrica titulo="Tiempo de riego" valor={formatearDuracion(minutosTotales)} icono="⏱️" />
        <Metrica
          titulo="Costo estimado"
          valor={formatearMoneda(costoTotal)}
          detalle="energía de bombeo + agua"
          icono="💵"
        />
      </section>

      {parcelas.length > 0 && (
        <nav className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/historial"
            className={!filtro ? "boton-primario" : "boton-secundario"}
          >
            Todas
          </Link>
          {parcelas.map((parcela) => (
            <Link
              key={parcela.id}
              href={`/historial?parcela=${parcela.id}`}
              className={filtro === parcela.id ? "boton-primario" : "boton-secundario"}
            >
              {parcela.nombre}
            </Link>
          ))}
        </nav>
      )}

      {riegos.length === 0 ? (
        <EstadoVacio
          titulo="Sin riegos registrados"
          descripcion="Cuando marques un riego como realizado va a aparecer acá, con el agua aplicada."
        />
      ) : (
        <div className="tarjeta overflow-x-auto p-0">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="texto-suave border-b text-left" style={{ borderColor: "var(--borde)" }}>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Parcela</th>
                <th className="px-4 py-3 font-medium">Duración</th>
                <th className="px-4 py-3 font-medium">Agua</th>
                <th className="px-4 py-3 font-medium">Lámina</th>
                <th className="px-4 py-3 font-medium">Costo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {riegos.map((riego) => (
                <tr key={riego.id} className="border-b last:border-0" style={{ borderColor: "var(--borde)" }}>
                  <td className="px-4 py-3 whitespace-nowrap">{formatearFechaHora(riego.fechaHora)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{riego.parcela.nombre}</span>
                    <span className="texto-suave block text-xs">{riego.parcela.cultivo}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatearDuracion(riego.duracionMin)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {riego.litros ? formatearLitros(riego.litros) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {riego.litros
                      ? `${formatearNumero(laminaMm(riego.litros, riego.parcela.superficieHa), 2)} mm`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {riego.estado === "COMPLETADO" ? formatearMoneda(costoDe(riego)) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <InsigniaEstado estado={riego.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
