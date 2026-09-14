"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ClimaDia, Configuracion, Parcela } from "@prisma/client";
import { Calculadora } from "@/components/Calculadora";

/**
 * Mantiene la parcela elegida en la URL: así el servidor puede traer su clima
 * y su último riego, y el enlace queda compartible.
 */
export function PanelCalculadora(props: {
  parcelas: Parcela[];
  configuracion: Configuracion;
  clima: ClimaDia[];
  ultimoRiego: Date | null;
  parcelaId: string;
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  return (
    <Calculadora
      {...props}
      alCambiarParcela={(id) => {
        const nuevos = new URLSearchParams(parametros.toString());
        nuevos.set("parcela", id);
        router.push(`/calculadora?${nuevos}`);
      }}
    />
  );
}
