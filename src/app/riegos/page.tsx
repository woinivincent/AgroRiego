import Link from "next/link";
import { obtenerParcelas, obtenerRiegosProgramados } from "@/lib/consultas";
import { FormularioRiego } from "@/components/FormularioRiego";
import { TarjetaRiego } from "@/components/TarjetaRiego";
import { EncabezadoPagina, EstadoVacio } from "@/components/Ui";

export const dynamic = "force-dynamic";

export default async function PaginaRiegos({
  searchParams,
}: {
  searchParams: Promise<{ parcela?: string }>;
}) {
  const [{ parcela: parcelaPreseleccionada }, parcelas, programados] = await Promise.all([
    searchParams,
    obtenerParcelas(),
    obtenerRiegosProgramados(),
  ]);

  const ahora = new Date();
  const atrasados = programados.filter((riego) => riego.fechaHora < ahora);
  const proximos = programados.filter((riego) => riego.fechaHora >= ahora);

  return (
    <>
      <EncabezadoPagina
        titulo="Riegos"
        descripcion="Programá los próximos riegos y marcá los que ya se hicieron."
        accion={
          parcelas.length === 0 ? (
            <Link href="/parcelas" className="boton-primario">
              Crear una parcela
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section>
          <div className="tarjeta">
            <h2 className="mb-4 text-lg font-semibold">Programar riego</h2>
            <FormularioRiego parcelas={parcelas} parcelaPreseleccionada={parcelaPreseleccionada} />
          </div>
        </section>

        <section className="space-y-8">
          {atrasados.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Atrasados ({atrasados.length})</h2>
              <ul className="grid gap-3">
                {atrasados.map((riego) => (
                  <TarjetaRiego key={riego.id} riego={riego} atrasado />
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-lg font-semibold">Programados ({proximos.length})</h2>
            {proximos.length === 0 ? (
              <EstadoVacio
                titulo="No hay riegos programados"
                descripcion="Usá el formulario para agendar el próximo riego de una parcela."
              />
            ) : (
              <ul className="grid gap-3">
                {proximos.map((riego) => (
                  <TarjetaRiego key={riego.id} riego={riego} />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
