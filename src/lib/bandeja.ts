// Bandeja de contactos: el estado del agente entre corridas.
//
// Es un JSON en disco (datos/bandeja.json, fuera de git porque tiene datos
// personales). Cada prospecto atraviesa el mismo camino:
//
//   BORRADOR --aprobar--> APROBADO --marcar-enviado--> ENVIADO
//       \                    /
//        \--- descartar ----/---> DESCARTADO --reabrir--> BORRADOR

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Mensaje } from "./mensajes";
import type { Prioridad, Prospecto, Segmento } from "./prospectos";

export const ESTADOS_CONTACTO = ["BORRADOR", "APROBADO", "ENVIADO", "DESCARTADO"] as const;
export type EstadoContacto = (typeof ESTADOS_CONTACTO)[number];

export const ETIQUETA_ESTADO_CONTACTO: Record<EstadoContacto, string> = {
  BORRADOR: "Borrador",
  APROBADO: "Aprobado",
  ENVIADO: "Enviado",
  DESCARTADO: "Descartado",
};

export type Movimiento = { fecha: string; estado: EstadoContacto; nota?: string };

export type Entrada = {
  prospecto: Prospecto;
  estado: EstadoContacto;
  mensaje?: Mensaje;
  historial: Movimiento[];
  actualizadaEn: string;
};

export type Bandeja = {
  version: 1;
  actualizadaEn: string;
  entradas: Record<string, Entrada>;
};

// Transiciones permitidas: nada de marcar como enviado algo que nadie aprobó
const TRANSICIONES: Record<EstadoContacto, EstadoContacto[]> = {
  BORRADOR: ["APROBADO", "DESCARTADO"],
  APROBADO: ["ENVIADO", "DESCARTADO", "BORRADOR"],
  ENVIADO: ["DESCARTADO"],
  DESCARTADO: ["BORRADOR"],
};

export function bandejaVacia(ahora = new Date()): Bandeja {
  return { version: 1, actualizadaEn: ahora.toISOString(), entradas: {} };
}

export function leerBandeja(ruta: string): Bandeja {
  try {
    const contenido = readFileSync(ruta, "utf8");
    const datos = JSON.parse(contenido) as Bandeja;
    if (datos?.version !== 1 || typeof datos.entradas !== "object") {
      throw new Error(`El archivo ${ruta} no tiene el formato de una bandeja`);
    }
    return datos;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return bandejaVacia();
    throw error;
  }
}

export function guardarBandeja(ruta: string, bandeja: Bandeja, ahora = new Date()) {
  mkdirSync(dirname(ruta), { recursive: true });
  const salida: Bandeja = { ...bandeja, actualizadaEn: ahora.toISOString() };
  writeFileSync(ruta, `${JSON.stringify(salida, null, 2)}\n`, "utf8");
  return salida;
}

export type ResultadoImportacion = {
  nuevos: number;
  actualizados: number;
  // Ya aprobados, enviados o descartados: la importación no los toca
  intactos: number;
};

/**
 * Suma prospectos a la bandeja. Reimportar el mismo export es inofensivo: lo
 * que ya salió de BORRADOR no se pisa, así no se reescribe un mensaje aprobado
 * ni se vuelve a encolar alguien a quien ya se contactó.
 */
export function importar(
  bandeja: Bandeja,
  prospectos: Prospecto[],
  ahora = new Date(),
): { bandeja: Bandeja; resultado: ResultadoImportacion } {
  const entradas = { ...bandeja.entradas };
  const resultado: ResultadoImportacion = { nuevos: 0, actualizados: 0, intactos: 0 };

  for (const prospecto of prospectos) {
    const previa = entradas[prospecto.id];
    if (!previa) {
      entradas[prospecto.id] = {
        prospecto,
        estado: "BORRADOR",
        historial: [{ fecha: ahora.toISOString(), estado: "BORRADOR", nota: `importado de ${prospecto.origen}` }],
        actualizadaEn: ahora.toISOString(),
      };
      resultado.nuevos++;
      continue;
    }
    if (previa.estado !== "BORRADOR") {
      resultado.intactos++;
      continue;
    }
    entradas[prospecto.id] = { ...previa, prospecto, actualizadaEn: ahora.toISOString() };
    resultado.actualizados++;
  }

  return { bandeja: { ...bandeja, entradas }, resultado };
}

export function guardarMensaje(
  bandeja: Bandeja,
  id: string,
  mensaje: Mensaje,
  ahora = new Date(),
): Bandeja {
  const entrada = bandeja.entradas[id];
  if (!entrada) throw new Error(`No hay ningún prospecto con id ${id}`);
  if (entrada.estado !== "BORRADOR") {
    throw new Error(
      `El mensaje de ${entrada.prospecto.nombreCompleto} está ${ETIQUETA_ESTADO_CONTACTO[entrada.estado].toLowerCase()}: no se reescribe`,
    );
  }
  return {
    ...bandeja,
    entradas: {
      ...bandeja.entradas,
      [id]: { ...entrada, mensaje, actualizadaEn: ahora.toISOString() },
    },
  };
}

export function cambiarEstado(
  bandeja: Bandeja,
  id: string,
  estado: EstadoContacto,
  { nota, ahora = new Date() }: { nota?: string; ahora?: Date } = {},
): Bandeja {
  const entrada = bandeja.entradas[id];
  if (!entrada) throw new Error(`No hay ningún prospecto con id ${id}`);
  if (entrada.estado === estado) return bandeja;
  if (!TRANSICIONES[entrada.estado].includes(estado)) {
    throw new Error(
      `No se puede pasar de ${ETIQUETA_ESTADO_CONTACTO[entrada.estado]} a ${ETIQUETA_ESTADO_CONTACTO[estado]}`,
    );
  }
  if (estado === "APROBADO" && !entrada.mensaje) {
    throw new Error(`${entrada.prospecto.nombreCompleto} no tiene mensaje redactado todavía`);
  }

  const fecha = ahora.toISOString();
  return {
    ...bandeja,
    entradas: {
      ...bandeja.entradas,
      [id]: {
        ...entrada,
        estado,
        historial: [...entrada.historial, { fecha, estado, ...(nota ? { nota } : {}) }],
        actualizadaEn: fecha,
      },
    },
  };
}

export type Filtro = {
  estado?: EstadoContacto;
  segmento?: Segmento;
  prioridad?: Prioridad;
  // Prefijo del id o texto en nombre / empresa
  busqueda?: string;
};

export function filtrar(bandeja: Bandeja, filtro: Filtro = {}): Entrada[] {
  const texto = filtro.busqueda?.toLowerCase();
  return Object.values(bandeja.entradas).filter((entrada) => {
    if (filtro.estado && entrada.estado !== filtro.estado) return false;
    if (filtro.segmento && entrada.prospecto.segmento !== filtro.segmento) return false;
    if (filtro.prioridad && entrada.prospecto.prioridad !== filtro.prioridad) return false;
    if (!texto) return true;
    const { id, nombreCompleto, empresa, email } = entrada.prospecto;
    return [id, nombreCompleto, empresa, email].some((valor) =>
      valor.toLowerCase().includes(texto),
    );
  });
}

export function resumen(bandeja: Bandeja) {
  const conteo: Record<EstadoContacto, number> = {
    BORRADOR: 0,
    APROBADO: 0,
    ENVIADO: 0,
    DESCARTADO: 0,
  };
  let conAdvertencias = 0;
  let sinRedactar = 0;

  for (const entrada of Object.values(bandeja.entradas)) {
    conteo[entrada.estado]++;
    if (entrada.estado === "BORRADOR" && !entrada.mensaje) sinRedactar++;
    if (entrada.mensaje?.advertencias.length) conAdvertencias++;
  }

  return { total: Object.keys(bandeja.entradas).length, conteo, conAdvertencias, sinRedactar };
}

/** Busca por id completo o por prefijo; falla si el prefijo es ambiguo. */
export function resolverId(bandeja: Bandeja, referencia: string) {
  if (bandeja.entradas[referencia]) return referencia;
  const candidatos = Object.keys(bandeja.entradas).filter((id) => id.startsWith(referencia));
  if (candidatos.length === 1) return candidatos[0];
  if (candidatos.length === 0) throw new Error(`No hay ningún prospecto con id ${referencia}`);
  throw new Error(`El id ${referencia} es ambiguo: coincide con ${candidatos.length} prospectos`);
}
