import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerParcela } from "@/lib/consultas";
import { FormularioParcela } from "@/components/FormularioParcela";
import { EncabezadoPagina } from "@/components/Ui";

export const dynamic = "force-dynamic";

export default async function PaginaEditarParcela({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parcela = await obtenerParcela(id);
  if (!parcela) notFound();

  return (
    <>
      <EncabezadoPagina
        titulo={`Editar ${parcela.nombre}`}
        descripcion="Actualizá los datos del lote o su configuración de riego."
        accion={
          <Link href="/parcelas" className="boton-secundario">
            Volver
          </Link>
        }
      />
      <div className="tarjeta max-w-3xl">
        <FormularioParcela parcela={parcela} />
      </div>
    </>
  );
}
