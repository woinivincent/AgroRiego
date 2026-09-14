"use client";

import { useActionState } from "react";
import { generarPlanSemanal } from "@/lib/acciones";
import { BotonEnvio } from "@/components/BotonEnvio";

type EstadoPlan = { error?: string; ok?: boolean; creados?: number };

const ESTADO_INICIAL: EstadoPlan = {};

export function BotonPlanSemanal() {
  const [estado, accion] = useActionState(
    async (): Promise<EstadoPlan> => generarPlanSemanal(),
    ESTADO_INICIAL,
  );

  return (
    <form action={accion} className="flex flex-wrap items-center gap-3">
      <BotonEnvio className="boton-secundario" textoPendiente="Generando…">
        Generar plan de la semana
      </BotonEnvio>
      {estado.ok && (
        <span className="text-sm text-campo-700">
          {estado.creados} riego(s) agendados.
        </span>
      )}
      {estado.error && <span className="texto-suave text-sm">{estado.error}</span>}
    </form>
  );
}
