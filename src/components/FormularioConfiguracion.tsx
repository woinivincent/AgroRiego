"use client";

import { useActionState } from "react";
import type { Configuracion } from "@prisma/client";
import { guardarConfiguracion, type EstadoAccion } from "@/lib/acciones";
import { BotonEnvio } from "@/components/BotonEnvio";
import { MensajeError } from "@/components/Ui";

const ESTADO_INICIAL: EstadoAccion = {};

export function FormularioConfiguracion({ configuracion }: { configuracion: Configuracion }) {
  const [estado, accion] = useActionState(guardarConfiguracion, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-4">
      <div>
        <label className="etiqueta" htmlFor="etoDiariaMm">
          ETo de referencia (mm/día)
        </label>
        <input
          id="etoDiariaMm"
          name="etoDiariaMm"
          type="number"
          step="0.1"
          min="0.1"
          className="campo"
          defaultValue={configuracion.etoDiariaMm}
          required
        />
        <p className="texto-suave mt-1 text-xs">
          Se usa para los días sin dato de clima, y para las parcelas que todavía no tienen
          coordenadas cargadas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="precioKwh">
            Precio del kWh
          </label>
          <input
            id="precioKwh"
            name="precioKwh"
            type="number"
            step="0.01"
            min="0"
            className="campo"
            defaultValue={configuracion.precioKwh}
            required
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="precioAguaM3">
            Precio del agua (por m³)
          </label>
          <input
            id="precioAguaM3"
            name="precioAguaM3"
            type="number"
            step="0.01"
            min="0"
            className="campo"
            defaultValue={configuracion.precioAguaM3}
            required
          />
        </div>
      </div>

      <MensajeError mensaje={estado.error} />
      {estado.ok && !estado.error && (
        <p className="rounded-lg bg-campo-500/10 px-3 py-2 text-sm text-campo-700">
          Configuración guardada.
        </p>
      )}

      <BotonEnvio>Guardar configuración</BotonEnvio>
    </form>
  );
}
