import { Suspense } from "react";
import { obtenerDatosCalculadora } from "@/lib/consultas";
import { PanelCalculadora } from "@/components/PanelCalculadora";
import { EncabezadoPagina } from "@/components/Ui";

export const dynamic = "force-dynamic";

export default async function PaginaCalculadora({
  searchParams,
}: {
  searchParams: Promise<{ parcela?: string }>;
}) {
  const { parcela } = await searchParams;
  const datos = await obtenerDatosCalculadora(parcela);
  const elegida = datos.parcelas.find((opcion) => opcion.id === parcela) ?? datos.parcelas[0];

  return (
    <>
      <EncabezadoPagina
        titulo="Calculadora de riego"
        descripcion="Cuánta agua pide el cultivo, cuánta tolera el suelo y cuánto tiempo hay que regar."
      />
      <Suspense fallback={<p className="texto-suave text-sm">Cargando…</p>}>
        <PanelCalculadora
          parcelas={datos.parcelas}
          configuracion={datos.configuracion}
          clima={datos.clima}
          ultimoRiego={datos.ultimoRiego}
          parcelaId={elegida?.id ?? ""}
        />
      </Suspense>
    </>
  );
}
