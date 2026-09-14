"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Parcela } from "@prisma/client";
import { actualizarParcela, crearParcela, type EstadoAccion } from "@/lib/acciones";
import { CULTIVOS, METODOS_RIEGO, TIPOS_SUELO } from "@/lib/constantes";
import { BotonEnvio } from "@/components/BotonEnvio";
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
          <select id="cultivo" name="cultivo" className="campo" defaultValue={parcela?.cultivo ?? ""} required>
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
          <select id="tipoSuelo" name="tipoSuelo" className="campo" defaultValue={parcela?.tipoSuelo ?? ""} required>
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
            defaultValue={parcela?.metodoRiego ?? ""}
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
          <p className="texto-suave mt-1 text-xs">Se usa para estimar los litros aplicados en cada riego.</p>
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="activa"
          className="size-4 accent-campo-600"
          defaultChecked={parcela ? parcela.activa : true}
        />
        Parcela activa (entra en el plan de riego)
      </label>

      <MensajeError mensaje={estado.error} />

      <div className="flex gap-2">
        <BotonEnvio>{esEdicion ? "Guardar cambios" : "Crear parcela"}</BotonEnvio>
      </div>
    </form>
  );
}
