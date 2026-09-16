"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { Parcela } from "@prisma/client";
import { programarRiego, type EstadoAccion } from "@/lib/acciones";
import { aInputDateTime, formatearLitros } from "@/lib/formato";
import { litrosEstimados } from "@/lib/riego";
import { BotonEnvio } from "@/components/BotonEnvio";
import { MensajeError } from "@/components/Ui";

const ESTADO_INICIAL: EstadoAccion = {};

export function FormularioRiego({
  parcelas,
  parcelaPreseleccionada,
  duracionSugerida,
}: {
  parcelas: Parcela[];
  parcelaPreseleccionada?: string;
  /** Minutos calculados por la calculadora, si se llegó desde ahí. */
  duracionSugerida?: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, accion] = useActionState(programarRiego, ESTADO_INICIAL);
  const [parcelaId, setParcelaId] = useState(parcelaPreseleccionada ?? parcelas[0]?.id ?? "");
  const [duracion, setDuracion] = useState(duracionSugerida ?? 60);
  const [fechaHora, setFechaHora] = useState("");

  // La fecha por defecto se calcula en el cliente para usar la zona horaria del navegador
  useEffect(() => {
    const proxima = new Date();
    proxima.setMinutes(0, 0, 0);
    proxima.setHours(proxima.getHours() + 1);
    setFechaHora(aInputDateTime(proxima));
  }, []);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  const parcela = useMemo(
    () => parcelas.find((candidata) => candidata.id === parcelaId),
    [parcelas, parcelaId],
  );

  const estimado = parcela ? litrosEstimados(parcela.caudalLh, duracion) : 0;

  if (parcelas.length === 0) {
    return (
      <p className="texto-suave text-sm">
        Primero cargá una parcela para poder programar riegos.
      </p>
    );
  }

  return (
    <form ref={formRef} action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="parcelaId">
            Parcela
          </label>
          <select
            id="parcelaId"
            name="parcelaId"
            className="campo"
            value={parcelaId}
            onChange={(evento) => setParcelaId(evento.target.value)}
            required
          >
            {parcelas.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.nombre} · {opcion.cultivo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="etiqueta" htmlFor="fechaHora">
            Fecha y hora
          </label>
          <input
            id="fechaHora"
            name="fechaHora"
            type="datetime-local"
            className="campo"
            value={fechaHora}
            onChange={(evento) => setFechaHora(evento.target.value)}
            required
          />
        </div>

        <div>
          <label className="etiqueta" htmlFor="duracionMin">
            Duración (minutos)
          </label>
          <input
            id="duracionMin"
            name="duracionMin"
            type="number"
            min="1"
            step="1"
            className="campo"
            value={duracion}
            onChange={(evento) => setDuracion(Number(evento.target.value) || 0)}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="notas">
            Notas (opcional)
          </label>
          <input
            id="notas"
            name="notas"
            className="campo"
            placeholder="Riego de reposición, fertirriego, etc."
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="yaRealizado" className="size-4 accent-campo-600" />
        Este riego ya se realizó (se guarda directo en el historial)
      </label>

      <p className="texto-suave rounded-lg bg-agua-500/10 px-3 py-2 text-sm">
        Agua estimada: <strong className="text-agua-600">{formatearLitros(estimado)}</strong>
        {parcela && ` · caudal ${parcela.caudalLh} L/h`}
      </p>

      <MensajeError mensaje={estado.error} />
      {estado.ok && !estado.error && (
        <p className="rounded-lg bg-campo-500/10 px-3 py-2 text-sm text-campo-700">Riego guardado.</p>
      )}

      <BotonEnvio className="boton-agua">Guardar riego</BotonEnvio>
    </form>
  );
}
