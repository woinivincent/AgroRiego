// Tablas y fórmulas agronómicas de la calculadora de riego.
// Funciones puras: sin base de datos, sin React, sin red.
//
// Los valores de las tablas son de referencia (aproximaciones de FAO-56) y
// están pensados para ajustarse a la zona y al manejo de cada explotación.

/** Fracción del agua aplicada que queda disponible para el cultivo. */
export const EFICIENCIA_METODO: Record<string, number> = {
  Goteo: 0.9,
  Microaspersión: 0.85,
  Pivote: 0.8,
  Aspersión: 0.75,
  Surco: 0.6,
  Manta: 0.5,
};

export const EFICIENCIA_POR_DEFECTO = 0.75;

/** Agua útil del suelo en mm por metro de profundidad, según textura. */
export const AGUA_UTIL_MM_POR_M: Record<string, number> = {
  Pedregoso: 60,
  Arenoso: 70,
  Franco: 140,
  Limoso: 160,
  Arcilloso: 180,
};

export const AGUA_UTIL_POR_DEFECTO = 120;

export const ETAPAS = ["INICIAL", "DESARROLLO", "MEDIA", "FINAL"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ETIQUETA_ETAPA: Record<Etapa, string> = {
  INICIAL: "Inicial",
  DESARROLLO: "Desarrollo",
  MEDIA: "Media (máxima demanda)",
  FINAL: "Final / maduración",
};

/** Coeficiente de cultivo (Kc) por etapa fenológica. */
export const KC_CULTIVO: Record<string, Record<Etapa, number>> = {
  Maíz: { INICIAL: 0.3, DESARROLLO: 0.8, MEDIA: 1.2, FINAL: 0.6 },
  Soja: { INICIAL: 0.4, DESARROLLO: 0.8, MEDIA: 1.15, FINAL: 0.5 },
  Trigo: { INICIAL: 0.3, DESARROLLO: 0.8, MEDIA: 1.15, FINAL: 0.4 },
  Vid: { INICIAL: 0.3, DESARROLLO: 0.6, MEDIA: 0.7, FINAL: 0.45 },
  Olivo: { INICIAL: 0.55, DESARROLLO: 0.6, MEDIA: 0.65, FINAL: 0.65 },
  Hortalizas: { INICIAL: 0.5, DESARROLLO: 0.8, MEDIA: 1.05, FINAL: 0.9 },
  Frutales: { INICIAL: 0.45, DESARROLLO: 0.75, MEDIA: 0.95, FINAL: 0.7 },
  Pastura: { INICIAL: 0.4, DESARROLLO: 0.8, MEDIA: 1.0, FINAL: 0.85 },
  Otro: { INICIAL: 0.5, DESARROLLO: 0.8, MEDIA: 1.0, FINAL: 0.8 },
};

/** Profundidad efectiva de raíces sugerida (m), como valor inicial por cultivo. */
export const PROFUNDIDAD_RAIZ_M: Record<string, number> = {
  Maíz: 1,
  Soja: 0.8,
  Trigo: 1,
  Vid: 1.2,
  Olivo: 1.2,
  Hortalizas: 0.4,
  Frutales: 1,
  Pastura: 0.6,
  Otro: 0.8,
};

export function eficiencia(metodoRiego: string) {
  return EFICIENCIA_METODO[metodoRiego] ?? EFICIENCIA_POR_DEFECTO;
}

export function aguaUtilPorMetro(tipoSuelo: string) {
  return AGUA_UTIL_MM_POR_M[tipoSuelo] ?? AGUA_UTIL_POR_DEFECTO;
}

export function kc(cultivo: string, etapa: string) {
  const porCultivo = KC_CULTIVO[cultivo] ?? KC_CULTIVO.Otro;
  return porCultivo[etapa as Etapa] ?? porCultivo.MEDIA;
}

export function profundidadRaizSugerida(cultivo: string) {
  return PROFUNDIDAD_RAIZ_M[cultivo] ?? 0.8;
}

/**
 * Agua útil total que el suelo puede retener en la zona de raíces (mm).
 * Es el "tamaño del tanque" con el que trabaja el balance hídrico.
 */
export function aguaUtilTotalMm(tipoSuelo: string, profundidadRaizM: number) {
  return aguaUtilPorMetro(tipoSuelo) * profundidadRaizM;
}

/**
 * Lámina neta máxima a reponer en un riego (mm): la fracción del agua útil que
 * se deja agotar antes de volver a regar. Regar más que esto se percola bajo
 * la zona de raíces y se pierde.
 */
export function laminaMaximaMm(
  tipoSuelo: string,
  profundidadRaizM: number,
  umbralAgotamiento: number,
) {
  return aguaUtilTotalMm(tipoSuelo, profundidadRaizM) * umbralAgotamiento;
}

export type DiaClima = { etoMm: number; lluviaMm: number };

/**
 * Demanda acumulada del cultivo desde el último riego (mm de lámina neta):
 * evapotranspiración del cultivo (ETo × Kc) menos la lluvia efectiva.
 * Nunca es negativa: la lluvia de más se drena o escurre, no se acumula a favor.
 */
export function deficitAcumuladoMm(dias: DiaClima[], coeficienteCultivo: number) {
  const balance = dias.reduce(
    (total, dia) => total + dia.etoMm * coeficienteCultivo - lluviaEfectivaMm(dia.lluviaMm),
    0,
  );
  return Math.max(0, balance);
}

/**
 * Lluvia efectiva: parte de la lluvia que queda disponible para el cultivo.
 * Las lluvias muy chicas se evaporan antes de infiltrar y las muy grandes
 * escurren, así que se descuentan 2 mm y se topea el aporte al 80%.
 */
export function lluviaEfectivaMm(lluviaMm: number) {
  if (lluviaMm <= 2) return 0;
  return Math.min(lluviaMm - 2, lluviaMm * 0.8);
}

export type Aplicacion = {
  laminaNetaMm: number;
  laminaBrutaMm: number;
  litros: number;
  minutos: number;
};

/**
 * Convierte una lámina objetivo (mm) en litros a aplicar y minutos de riego.
 * 1 mm equivale a 1 litro por m²; la eficiencia del método agrega el agua que
 * se pierde en el camino y no llega a la raíz.
 */
export function aplicacionDesdeLamina({
  laminaNetaMm,
  superficieHa,
  caudalLh,
  metodoRiego,
}: {
  laminaNetaMm: number;
  superficieHa: number;
  caudalLh: number;
  metodoRiego: string;
}): Aplicacion {
  const rendimiento = eficiencia(metodoRiego);
  const laminaBrutaMm = laminaNetaMm / rendimiento;
  const litros = laminaBrutaMm * superficieHa * 10_000;
  const minutos = caudalLh > 0 ? (litros / caudalLh) * 60 : 0;

  return {
    laminaNetaMm,
    laminaBrutaMm,
    litros: Math.round(litros),
    minutos: Math.round(minutos),
  };
}

/** Camino inverso: qué lámina neta deja una duración de riego dada. */
export function laminaDesdeDuracion({
  duracionMin,
  superficieHa,
  caudalLh,
  metodoRiego,
}: {
  duracionMin: number;
  superficieHa: number;
  caudalLh: number;
  metodoRiego: string;
}) {
  if (superficieHa <= 0) return { litros: 0, laminaNetaMm: 0 };
  const litros = (caudalLh * duracionMin) / 60;
  const laminaBrutaMm = litros / (superficieHa * 10_000);
  return { litros: Math.round(litros), laminaNetaMm: laminaBrutaMm * eficiencia(metodoRiego) };
}

export type Costo = { energia: number; agua: number; total: number };

/** Costo de una aplicación: energía de bombeo más el agua consumida. */
export function costoAplicacion({
  litros,
  minutos,
  potenciaBombaKw,
  precioKwh,
  precioAguaM3,
}: {
  litros: number;
  minutos: number;
  potenciaBombaKw: number | null;
  precioKwh: number;
  precioAguaM3: number;
}): Costo {
  const energia = (potenciaBombaKw ?? 0) * (minutos / 60) * precioKwh;
  const agua = (litros / 1000) * precioAguaM3;
  return { energia, agua, total: energia + agua };
}
