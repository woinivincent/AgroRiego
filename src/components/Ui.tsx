import type { ReactNode } from "react";
import { ETIQUETA_ESTADO, type EstadoRiego } from "@/lib/constantes";

export function EncabezadoPagina({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="texto-suave mt-1 text-sm">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}

export function Metrica({
  titulo,
  valor,
  detalle,
  icono,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icono: string;
}) {
  return (
    <div className="tarjeta">
      <div className="flex items-start justify-between gap-2">
        <p className="texto-suave text-sm font-medium">{titulo}</p>
        <span aria-hidden className="text-lg">
          {icono}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{valor}</p>
      {detalle && <p className="texto-suave mt-1 text-xs">{detalle}</p>}
    </div>
  );
}

const COLORES_ESTADO: Record<EstadoRiego, string> = {
  PROGRAMADO: "bg-agua-500/15 text-agua-600",
  COMPLETADO: "bg-campo-500/15 text-campo-700",
  CANCELADO: "bg-neutral-500/15 text-neutral-500",
};

export function InsigniaEstado({ estado }: { estado: string }) {
  const clave = (ETIQUETA_ESTADO[estado as EstadoRiego] ? estado : "CANCELADO") as EstadoRiego;
  return <span className={`insignia ${COLORES_ESTADO[clave]}`}>{ETIQUETA_ESTADO[clave]}</span>;
}

export function EstadoVacio({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div
      className="rounded-xl border border-dashed p-8 text-center"
      style={{ borderColor: "var(--borde)" }}
    >
      <p className="font-semibold">{titulo}</p>
      <p className="texto-suave mx-auto mt-1 max-w-md text-sm">{descripcion}</p>
    </div>
  );
}

export function MensajeError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
      {mensaje}
    </p>
  );
}
