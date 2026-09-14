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

export const TIPOS_SUELO = ["Arenoso", "Franco", "Arcilloso", "Limoso", "Pedregoso"] as const;

export const METODOS_RIEGO = ["Goteo", "Aspersión", "Microaspersión", "Surco", "Manta", "Pivote"] as const;
