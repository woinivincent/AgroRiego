"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { ClimaDia, Configuracion, Parcela } from "@prisma/client";
import { calcularBalance } from "@/lib/balance";
import { ETIQUETA_ETAPA, type Etapa } from "@/lib/agronomia";
import { sincronizarClima, type EstadoClima } from "@/lib/acciones";
import {
  formatearDuracion,
  formatearFecha,
  formatearLitros,
  formatearNumero,
} from "@/lib/formato";
import { BotonEnvio } from "@/components/BotonEnvio";
import { MensajeError } from "@/components/Ui";

const ESTADO_INICIAL: EstadoClima = {};

const ETIQUETA_FUENTE: Record<string, string> = {
  OPEN_METEO: "Open-Meteo",
  MANUAL: "carga manual",
  MIXTA: "mixta (días estimados)",
  ESTIMADO: "estimada con la ETo de referencia",
};

function Dato({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div>
      <dt className="texto-suave text-xs">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
      {detalle && <dd className="texto-suave text-xs">{detalle}</dd>}
    </div>
  );
}

export function Calculadora({
  parcelas,
  configuracion,
  clima,
  ultimoRiego,
  parcelaId,
  alCambiarParcela,
}: {
  parcelas: Parcela[];
  configuracion: Configuracion;
  clima: ClimaDia[];
  ultimoRiego: Date | null;
  parcelaId: string;
  alCambiarParcela: (id: string) => void;
}) {
  const [estadoClima, accionClima] = useActionState(sincronizarClima, ESTADO_INICIAL);
  const [laminaManual, setLaminaManual] = useState<number | null>(null);

  const parcela = parcelas.find((candidata) => candidata.id === parcelaId);

  // El balance sugerido manda mientras no toques la lámina a mano
  const sugerido = useMemo(
    () => (parcela ? calcularBalance({ parcela, clima, configuracion, ultimoRiego }) : null),
    [parcela, clima, configuracion, ultimoRiego],
  );

  const balance = useMemo(
    () =>
      parcela && laminaManual !== null
        ? calcularBalance({
            parcela,
            clima,
            configuracion,
            ultimoRiego,
            laminaObjetivoMm: laminaManual,
          })
        : sugerido,
    [parcela, clima, configuracion, ultimoRiego, laminaManual, sugerido],
  );

  if (!parcela || !balance || !sugerido) {
    return (
      <p className="texto-suave text-sm">
        Cargá una parcela para poder calcular el riego.{" "}
        <Link href="/parcelas" className="underline">
          Ir a parcelas
        </Link>
        .
      </p>
    );
  }

  const sinCoordenadas = parcela.latitud === null || parcela.longitud === null;
  const excedeSuelo = balance.laminaSugeridaMm > balance.laminaMaximaMm + 0.01;
  const porcentaje = Math.min(100, Math.round(balance.agotamiento * 100));

  return (
    <div className="space-y-6">
      <div className="tarjeta">
        <label className="etiqueta" htmlFor="parcela">
          Parcela
        </label>
        <select
          id="parcela"
          className="campo"
          value={parcelaId}
          onChange={(evento) => {
            setLaminaManual(null);
            alCambiarParcela(evento.target.value);
          }}
        >
          {parcelas.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>
              {opcion.nombre} · {opcion.cultivo}
            </option>
          ))}
        </select>
        <p className="texto-suave mt-2 text-xs">
          {formatearNumero(parcela.superficieHa)} ha · {parcela.metodoRiego} (eficiencia{" "}
          {Math.round(balance.eficienciaMetodo * 100)}%) · suelo {parcela.tipoSuelo} · etapa{" "}
          {ETIQUETA_ETAPA[parcela.etapaCultivo as Etapa] ?? parcela.etapaCultivo} (Kc{" "}
          {formatearNumero(balance.coeficienteCultivo, 2)})
        </p>
      </div>

      {/* 1. Cuánta agua pide el cultivo */}
      <section className="tarjeta">
        <h2 className="mb-1 text-lg font-semibold">1. Demanda del cultivo</h2>
        <p className="texto-suave mb-4 text-sm">
          Evapotranspiración acumulada desde el último riego, menos la lluvia efectiva.
        </p>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dato
            etiqueta="Días sin regar"
            valor={String(balance.diasDesdeUltimoRiego)}
            detalle={ultimoRiego ? formatearFecha(ultimoRiego) : "sin riegos previos"}
          />
          <Dato
            etiqueta="ETo acumulada"
            valor={`${formatearNumero(balance.etoAcumuladaMm)} mm`}
            detalle={`× Kc ${formatearNumero(balance.coeficienteCultivo, 2)}`}
          />
          <Dato
            etiqueta="Lluvia efectiva"
            valor={`${formatearNumero(balance.lluviaEfectivaAcumuladaMm)} mm`}
          />
          <Dato
            etiqueta="Déficit a reponer"
            valor={`${formatearNumero(balance.deficitMm)} mm`}
            detalle={`fuente: ${ETIQUETA_FUENTE[balance.fuenteClima] ?? balance.fuenteClima}`}
          />
        </dl>

        <form action={accionClima} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="parcelaId" value={parcela.id} />
          <BotonEnvio className="boton-agua" textoPendiente="Consultando…">
            Traer clima de Open-Meteo
          </BotonEnvio>
          <span className="texto-suave text-xs">
            {sinCoordenadas
              ? "Esta parcela todavía no tiene coordenadas cargadas."
              : `${formatearNumero(parcela.latitud!, 4)}, ${formatearNumero(parcela.longitud!, 4)} · ${balance.diasConDatoReal} día(s) con dato real`}
          </span>
        </form>

        <MensajeError mensaje={estadoClima.error} />
        {estadoClima.ok && (
          <p className="mt-2 rounded-lg bg-campo-500/10 px-3 py-2 text-sm text-campo-700">
            Clima actualizado: {estadoClima.sincronizados} día(s) guardados.
          </p>
        )}
        {sinCoordenadas && (
          <p className="texto-suave mt-2 text-xs">
            <Link href={`/parcelas/${parcela.id}/editar`} className="underline">
              Cargale las coordenadas
            </Link>{" "}
            para traer la ETo real; mientras tanto se usa la ETo de referencia (
            {formatearNumero(configuracion.etoDiariaMm)} mm/día).
          </p>
        )}
      </section>

      {/* 2. Cuánta agua aguanta el suelo */}
      <section className="tarjeta">
        <h2 className="mb-1 text-lg font-semibold">2. Qué tolera el suelo</h2>
        <p className="texto-suave mb-4 text-sm">
          Regar por encima del tope percola bajo la zona de raíces y se pierde.
        </p>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dato
            etiqueta="Agua útil"
            valor={`${formatearNumero(balance.aguaUtilTotalMm)} mm`}
            detalle={`${parcela.tipoSuelo}, raíces a ${formatearNumero(parcela.profundidadRaizM, 2)} m`}
          />
          <Dato
            etiqueta="Tope por riego"
            valor={`${formatearNumero(balance.laminaMaximaMm)} mm`}
            detalle={`umbral ${Math.round(parcela.umbralAgotamiento * 100)}%`}
          />
          <Dato etiqueta="Agotamiento" valor={`${porcentaje}%`} />
          <Dato
            etiqueta="Estado"
            valor={balance.necesitaRiego ? "Regar ya" : "Puede esperar"}
          />
        </dl>

        <div
          className="mt-4 h-3 w-full overflow-hidden rounded-full"
          style={{ background: "var(--superficie-suave)" }}
          role="img"
          aria-label={`Agua útil agotada: ${porcentaje} por ciento`}
        >
          <div
            className={`h-full rounded-full ${balance.necesitaRiego ? "bg-amber-500" : "bg-campo-500"}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </section>

      {/* 3. Cuánto hay que regar */}
      <section className="tarjeta">
        <h2 className="mb-1 text-lg font-semibold">3. Cuánto regar</h2>
        <p className="texto-suave mb-4 text-sm">
          De la lámina objetivo salen los litros y el tiempo de bomba, sumando el agua que el
          método pierde en el camino.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="lamina">
              Lámina objetivo (mm)
            </label>
            <input
              id="lamina"
              type="number"
              min="0"
              step="0.5"
              className="campo"
              value={formatearEntrada(balance.laminaSugeridaMm)}
              onChange={(evento) => setLaminaManual(Number(evento.target.value) || 0)}
            />
            <button
              type="button"
              className="texto-suave mt-1 text-xs underline"
              onClick={() => setLaminaManual(null)}
            >
              Volver a la sugerida ({formatearNumero(sugerido.laminaSugeridaMm)} mm)
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-4 self-end">
            <Dato
              etiqueta="Lámina bruta"
              valor={`${formatearNumero(balance.aplicacion.laminaBrutaMm)} mm`}
            />
            <Dato etiqueta="Agua a aplicar" valor={formatearLitros(balance.aplicacion.litros)} />
          </dl>
        </div>

        {excedeSuelo && (
          <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
            La lámina supera lo que el suelo puede retener ({formatearNumero(balance.laminaMaximaMm)}{" "}
            mm): el excedente va a percolar bajo las raíces.
          </p>
        )}

        <div className="mt-4 rounded-lg bg-agua-500/10 p-4">
          <p className="texto-suave text-sm">Tiempo de riego</p>
          <p className="text-3xl font-bold text-agua-600">
            {formatearDuracion(balance.aplicacion.minutos)}
          </p>
          <p className="texto-suave mt-1 text-xs">
            a {formatearNumero(parcela.caudalLh, 0)} L/h ={" "}
            {formatearLitros(balance.aplicacion.litros)}
          </p>
        </div>
      </section>

      {/* 4. Cuánto cuesta */}
      <section className="tarjeta">
        <h2 className="mb-1 text-lg font-semibold">4. Costo de la aplicación</h2>
        <p className="texto-suave mb-4 text-sm">
          Según los precios cargados en{" "}
          <Link href="/configuracion" className="underline">
            configuración
          </Link>
          .
        </p>

        <dl className="grid grid-cols-3 gap-4">
          <Dato
            etiqueta="Energía"
            valor={formatearMoneda(balance.costo.energia)}
            detalle={
              parcela.potenciaBombaKw
                ? `${formatearNumero(parcela.potenciaBombaKw)} kW × ${formatearNumero(balance.aplicacion.minutos / 60, 2)} h`
                : "sin potencia de bomba cargada"
            }
          />
          <Dato etiqueta="Agua" valor={formatearMoneda(balance.costo.agua)} />
          <Dato etiqueta="Total" valor={formatearMoneda(balance.costo.total)} />
        </dl>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/riegos?parcela=${parcela.id}&duracion=${balance.aplicacion.minutos}`}
          className="boton-primario"
        >
          Programar este riego ({formatearDuracion(balance.aplicacion.minutos)})
        </Link>
        <Link href={`/parcelas/${parcela.id}/editar`} className="boton-secundario">
          Ajustar datos de la parcela
        </Link>
      </div>
    </div>
  );
}

function formatearEntrada(valor: number) {
  return Math.round(valor * 10) / 10;
}

function formatearMoneda(valor: number) {
  return valor.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}
