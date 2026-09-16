"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Parcela } from "@prisma/client";
import {
  actualizarParcela,
  crearParcela,
  type EstadoAccion,
} from "@/lib/acciones";
import { CULTIVOS, METODOS_RIEGO, TIPOS_SUELO } from "@/lib/constantes";
import {
  EFICIENCIA_METODO,
  ETAPAS,
  ETIQUETA_ETAPA,
  profundidadRaizSugerida,
} from "@/lib/agronomia";
import { BotonEnvio } from "@/components/BotonEnvio";
import { SelectorUbicacion } from "@/components/SelectorUbicacion";
import { MensajeError } from "@/components/Ui";

const ESTADO_INICIAL: EstadoAccion = {};

export function FormularioParcela({
  parcela,
  alGuardar,
}: {
  parcela?: Parcela;
  alGuardar?: () => void;
}) {
  const esEdicion = Boolean(parcela);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [cultivo, setCultivo] = useState(parcela?.cultivo ?? "");
  const [metodoRiego, setMetodoRiego] = useState(parcela?.metodoRiego ?? "");
  const [profundidad, setProfundidad] = useState(
    parcela?.profundidadRaizM ??
      profundidadRaizSugerida(parcela?.cultivo ?? ""),
  );
  const [estado, accion] = useActionState(
    esEdicion ? actualizarParcela : crearParcela,
    ESTADO_INICIAL,
  );

  useEffect(() => {
    if (!estado.ok) return;
    if (esEdicion) {
      router.push("/parcelas");
      return;
    }
    formRef.current?.reset();
    alGuardar?.();
  }, [estado, esEdicion, router, alGuardar]);

  return (
    <form ref={formRef} action={accion} className="space-y-4">
      {parcela && <input type="hidden" name="id" value={parcela.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="nombre">
            Nombre de la parcela
          </label>
          <input
            id="nombre"
            name="nombre"
            className="campo"
            required
            defaultValue={parcela?.nombre}
            placeholder="Lote 3 — Norte"
          />
        </div>

        <div>
          <label className="etiqueta" htmlFor="superficieHa">
            Superficie (ha)
          </label>
          <input
            id="superficieHa"
            name="superficieHa"
            type="number"
            step="0.01"
            min="0.01"
            className="campo"
            required
            defaultValue={parcela?.superficieHa}
            placeholder="2.5"
          />
        </div>

        <div>
          <label className="etiqueta" htmlFor="cultivo">
            Cultivo
          </label>
          <select
            id="cultivo"
            name="cultivo"
            className="campo"
            value={cultivo}
            onChange={(evento) => {
              setCultivo(evento.target.value);
              setProfundidad(profundidadRaizSugerida(evento.target.value));
            }}
            required
          >
            <option value="" disabled>
              Elegí un cultivo
            </option>
            {CULTIVOS.map((cultivo) => (
              <option key={cultivo} value={cultivo}>
                {cultivo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="etiqueta" htmlFor="tipoSuelo">
            Tipo de suelo
          </label>
          <select
            id="tipoSuelo"
            name="tipoSuelo"
            className="campo"
            defaultValue={parcela?.tipoSuelo ?? ""}
            required
          >
            <option value="" disabled>
              Elegí el suelo
            </option>
            {TIPOS_SUELO.map((suelo) => (
              <option key={suelo} value={suelo}>
                {suelo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="etiqueta" htmlFor="metodoRiego">
            Método de riego
          </label>
          <select
            id="metodoRiego"
            name="metodoRiego"
            className="campo"
            value={metodoRiego}
            onChange={(evento) => setMetodoRiego(evento.target.value)}
            required
          >
            <option value="" disabled>
              Elegí el método
            </option>
            {METODOS_RIEGO.map((metodo) => (
              <option key={metodo} value={metodo}>
                {metodo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="etiqueta" htmlFor="caudalLh">
            Caudal del sistema (L/h)
          </label>
          <input
            id="caudalLh"
            name="caudalLh"
            type="number"
            step="1"
            min="1"
            className="campo"
            required
            defaultValue={parcela?.caudalLh}
            placeholder="1200"
          />
          <p className="texto-suave mt-1 text-xs">
            Se usa para estimar los litros aplicados en cada riego.
          </p>
        </div>

        <div>
          <label className="etiqueta" htmlFor="frecuenciaDias">
            Frecuencia de riego (días)
          </label>
          <input
            id="frecuenciaDias"
            name="frecuenciaDias"
            type="number"
            step="1"
            min="1"
            className="campo"
            required
            defaultValue={parcela?.frecuenciaDias ?? 3}
          />
        </div>

        <div>
          <label className="etiqueta" htmlFor="etapaCultivo">
            Etapa del cultivo
          </label>
          <select
            id="etapaCultivo"
            name="etapaCultivo"
            className="campo"
            defaultValue={parcela?.etapaCultivo ?? "MEDIA"}
          >
            {ETAPAS.map((etapa) => (
              <option key={etapa} value={etapa}>
                {ETIQUETA_ETAPA[etapa]}
              </option>
            ))}
          </select>
          <p className="texto-suave mt-1 text-xs">
            Define el Kc con el que se estima la demanda.
          </p>
        </div>

        <details
          className="sm:col-span-2 rounded-xl border p-4"
          style={{ borderColor: "var(--borde)" }}
        >
          <summary className="cursor-pointer text-sm font-semibold">
            Ajustes avanzados
            <span className="texto-suave ml-2 font-normal">
              ya vienen con valores razonables según el cultivo y el método
            </span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="profundidadRaizM">
                Profundidad de raíces (m)
              </label>
              <input
                id="profundidadRaizM"
                name="profundidadRaizM"
                type="number"
                step="0.1"
                min="0.1"
                className="campo"
                value={profundidad}
                onChange={(evento) =>
                  setProfundidad(Number(evento.target.value) || 0)
                }
                required
              />
              <p className="texto-suave mt-1 text-xs">
                Sugerida para {cultivo || "el cultivo"}:{" "}
                {profundidadRaizSugerida(cultivo)} m.
              </p>
            </div>

            <div>
              <label className="etiqueta" htmlFor="umbralAgotamiento">
                Umbral de agotamiento (0 a 1)
              </label>
              <input
                id="umbralAgotamiento"
                name="umbralAgotamiento"
                type="number"
                step="0.05"
                min="0.05"
                max="1"
                className="campo"
                defaultValue={parcela?.umbralAgotamiento ?? 0.5}
                required
              />
              <p className="texto-suave mt-1 text-xs">
                Fracción del agua útil que se deja consumir antes de regar.
              </p>
            </div>

            <div>
              <label className="etiqueta" htmlFor="potenciaBombaKw">
                Potencia de la bomba (kW, opcional)
              </label>
              <input
                id="potenciaBombaKw"
                name="potenciaBombaKw"
                type="number"
                step="0.1"
                min="0"
                className="campo"
                defaultValue={parcela?.potenciaBombaKw ?? ""}
              />
              <p className="texto-suave mt-1 text-xs">
                Se usa para costear la energía de cada riego.
              </p>
            </div>
            <div>
              <label className="etiqueta" htmlFor="eficienciaRiego">
                Eficiencia medida (0 a 1, opcional)
              </label>
              <input
                id="eficienciaRiego"
                name="eficienciaRiego"
                type="number"
                step="0.05"
                min="0.05"
                max="1"
                className="campo"
                defaultValue={parcela?.eficienciaRiego ?? ""}
                placeholder={String(EFICIENCIA_METODO[metodoRiego] ?? "")}
              />
              <p className="texto-suave mt-1 text-xs">
                Vacío usa el valor de diseño del método (
                {Math.round((EFICIENCIA_METODO[metodoRiego] ?? 0.75) * 100)}
                %). El de un sistema real a campo suele ser bastante menor.
              </p>
            </div>
          </div>
        </details>

        <fieldset className="sm:col-span-2">
          <legend className="etiqueta">Ubicación del lote</legend>
          <SelectorUbicacion
            latitud={parcela?.latitud}
            longitud={parcela?.longitud}
          />
        </fieldset>

        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="notas">
            Notas (opcional)
          </label>
          <textarea
            id="notas"
            name="notas"
            rows={2}
            className="campo"
            defaultValue={parcela?.notas ?? ""}
            placeholder="Observaciones del lote, sector, etc."
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="activa"
            className="size-4 accent-campo-600"
            defaultChecked={parcela ? parcela.activa : true}
          />
          Parcela activa (entra en el plan de riego)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="encadenarRiegos"
            className="size-4 accent-campo-600"
            defaultChecked={parcela ? parcela.encadenarRiegos : true}
          />
          Al completar un riego, agendar el siguiente automáticamente
        </label>
      </div>

      <MensajeError mensaje={estado.error} />

      <div className="flex gap-2">
        <BotonEnvio>
          {esEdicion ? "Guardar cambios" : "Crear parcela"}
        </BotonEnvio>
      </div>
    </form>
  );
}
