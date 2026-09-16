export const ESTADOS_RIEGO = ["PROGRAMADO", "COMPLETADO", "CANCELADO"] as const;
export type EstadoRiego = (typeof ESTADOS_RIEGO)[number];

export const ETIQUETA_ESTADO: Record<EstadoRiego, string> = {
  PROGRAMADO: "Programado",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

export const CULTIVOS = [
  "Maíz",
  "Soja",
  "Trigo",
  "Vid",
  "Olivo",
  "Hortalizas",
  "Frutales",
  "Pastura",
  "Otro",
] as const;

// Ordenados de menor a mayor agua útil (ver AGUA_UTIL_MM_POR_M)
export const TIPOS_SUELO = [
  "Arenoso",
  "Pedregoso",
  "Franco arenoso",
  "Franco",
  "Limoso",
  "Franco arcilloso",
  "Arcilloso",
] as const;

export const METODOS_RIEGO = ["Goteo", "Aspersión", "Microaspersión", "Surco", "Manta", "Pivote"] as const;
