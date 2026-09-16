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
          {formatearNumero(parcela.superficieHa)} ha · {parcela.metodoRiego} · suelo{" "}
          {parcela.tipoSuelo} · etapa{" "}
          {ETIQUETA_ETAPA[parcela.etapaCultivo as Etapa] ?? parcela.etapaCultivo}
        </p>
      </div>

      {/* La respuesta que el productor vino a buscar, antes que cualquier jerga */}
      <section className="tarjeta">
        <p className="texto-suave text-sm">
          {balance.necesitaRiego
            ? "Esta parcela necesita riego"
            : "Esta parcela puede esperar, pero si regás hoy:"}
        </p>
        <p className="mt-1 text-4xl font-bold tracking-tight text-agua-600">
          {formatearDuracion(balance.aplicacion.minutos)}
        </p>
        <p className="mt-2 text-lg font-semibold">
          {formatearLitros(balance.aplicacion.litros)}
          <span className="texto-suave font-normal"> de agua · </span>
          {formatearMoneda(balance.costo.total)}
        </p>
        <p className="texto-suave mt-1 text-sm">
          Repone {formatearNumero(balance.laminaSugeridaMm)} mm en{" "}
          {formatearNumero(parcela.superficieHa)} ha, a {formatearNumero(parcela.caudalLh, 0)} L/h.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="etiqueta mb-0.5 text-xs" htmlFor="lamina">
              Ajustar milímetros a reponer
            </label>
            <input
              id="lamina"
              type="number"
              min="0"
              step="0.5"
              className="campo w-32"
              value={formatearEntrada(balance.laminaSugeridaMm)}
              onChange={(evento) => setLaminaManual(Number(evento.target.value) || 0)}
            />
          </div>
          {laminaManual !== null && (
            <button type="button" className="boton-secundario" onClick={() => setLaminaManual(null)}>
              Volver a {formatearNumero(sugerido.laminaSugeridaMm)} mm
            </button>
          )}
        </div>

        {excedeSuelo && (
          <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
            Son más milímetros de los que este suelo puede retener (
            {formatearNumero(balance.laminaMaximaMm)} mm): el excedente va a percolar bajo las
            raíces.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/riegos?parcela=${parcela.id}&duracion=${balance.aplicacion.minutos}`}
            className="boton-primario"
          >
            Programar este riego
          </Link>
          <Link href={`/parcelas/${parcela.id}/editar`} className="boton-secundario">
            Ajustar datos de la parcela
          </Link>
        </div>
      </section>

      {/* Traer el clima es la acción que más cambia el número de arriba */}
      <section className="tarjeta">
        <form action={accionClima} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="parcelaId" value={parcela.id} />
          <BotonEnvio className="boton-agua" textoPendiente="Consultando…">
            Actualizar clima
          </BotonEnvio>
          <span className="texto-suave text-sm">
            {sinCoordenadas ? (
              <>
                Sin coordenadas: se está estimando con {formatearNumero(configuracion.etoDiariaMm)}{" "}
                mm/día.{" "}
                <Link href={`/parcelas/${parcela.id}/editar`} className="underline">
                  Cargalas acá
                </Link>
                .
              </>
            ) : (
              `${balance.diasConDatoReal} de ${balance.diasDesdeUltimoRiego} día(s) con clima real · fuente ${ETIQUETA_FUENTE[balance.fuenteClima] ?? balance.fuenteClima}`
            )}
          </span>
        </form>

        <MensajeError mensaje={estadoClima.error} />
        {estadoClima.ok && (
          <p className="mt-2 rounded-lg bg-campo-500/10 px-3 py-2 text-sm text-campo-700">
            Clima actualizado: {estadoClima.sincronizados} día(s) guardados.
          </p>
        )}
      </section>

      <details className="tarjeta">
        <summary className="cursor-pointer font-semibold">Ver el cálculo paso a paso</summary>

        <div className="mt-5 space-y-6">
          <div>
            <h3 className="mb-1 font-semibold">1. Cuánta agua pidió el cultivo</h3>
            <p className="texto-suave mb-3 text-sm">
              Evapotranspiración acumulada desde el último riego, por el coeficiente del cultivo,
              menos la lluvia que realmente aprovechó.
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
              />
            </dl>
          </div>

          <div>
            <h3 className="mb-1 font-semibold">2. Cuánta agua tolera el suelo</h3>
            <p className="texto-suave mb-3 text-sm">
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
              <Dato etiqueta="Estado" valor={balance.necesitaRiego ? "Regar ya" : "Puede esperar"} />
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
          </div>

          <div>
            <h3 className="mb-1 font-semibold">3. Cuánta agua hay que largar</h3>
            <p className="texto-suave mb-3 text-sm">
              A los milímetros que faltan se les suma el agua que el método pierde en el camino.
            </p>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Dato
                etiqueta="Lámina neta"
                valor={`${formatearNumero(balance.laminaSugeridaMm)} mm`}
              />
              <Dato
                etiqueta="Eficiencia"
                valor={`${Math.round(balance.eficienciaMetodo * 100)}%`}
                detalle={balance.eficienciaEsMedida ? "medida en esta parcela" : "valor de diseño"}
              />
              <Dato
                etiqueta="Lámina bruta"
                valor={`${formatearNumero(balance.aplicacion.laminaBrutaMm)} mm`}
              />
              <Dato etiqueta="Agua a aplicar" valor={formatearLitros(balance.aplicacion.litros)} />
            </dl>
            {!balance.eficienciaEsMedida && (
              <p className="texto-suave mt-3 text-xs">
                La eficiencia es la de diseño del método. Un sistema real a campo suele rendir
                bastante menos:{" "}
                <Link href={`/parcelas/${parcela.id}/editar`} className="underline">
                  cargá la medida
                </Link>{" "}
                si la conocés.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-1 font-semibold">4. Cuánto cuesta</h3>
            <p className="texto-suave mb-3 text-sm">
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
          </div>
        </div>
      </details>
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
