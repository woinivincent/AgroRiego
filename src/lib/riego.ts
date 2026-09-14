// Lógica de dominio pura: sin acceso a base de datos ni a React.

export const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Agua aplicada estimada a partir del caudal del sistema y la duración del riego. */
export function litrosEstimados(caudalLh: number, duracionMin: number) {
  return Math.round((caudalLh * duracionMin) / 60);
}

/** Lámina de agua aplicada en mm (1 mm = 1 L/m²). */
export function laminaMm(litros: number, superficieHa: number) {
  if (superficieHa <= 0) return 0;
  return litros / (superficieHa * 10_000);
}

export function inicioDelDia(fecha: Date) {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

/** Lunes de la semana de `fecha`, a las 00:00. */
export function inicioDeSemana(fecha: Date) {
  const inicio = inicioDelDia(fecha);
  // getDay(): 0 = domingo. Queremos que la semana arranque el lunes.
  const diasDesdeLunes = (inicio.getDay() + 6) % 7;
  inicio.setDate(inicio.getDate() - diasDesdeLunes);
  return inicio;
}

export function finDeSemana(fecha: Date) {
  const fin = inicioDeSemana(fecha);
  fin.setDate(fin.getDate() + 7);
  return fin;
}

export function inicioDeMes(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

export function diasEntre(desde: Date, hasta: Date) {
  return Math.floor((inicioDelDia(hasta).getTime() - inicioDelDia(desde).getTime()) / MS_POR_DIA);
}

export type EstadoHidrico = {
  diasDesdeUltimoRiego: number | null;
  diasParaProximoRiego: number | null;
  necesitaRiego: boolean;
  urgente: boolean;
};

/**
 * Compara el último riego completado con la frecuencia configurada de la parcela.
 * Una parcela sin riegos registrados se considera pendiente de riego.
 */
export function estadoHidrico(
  ultimoRiego: Date | null,
  frecuenciaDias: number,
  ahora: Date = new Date(),
): EstadoHidrico {
  if (!ultimoRiego) {
    return {
      diasDesdeUltimoRiego: null,
      diasParaProximoRiego: null,
      necesitaRiego: true,
      urgente: false,
    };
  }

  const diasDesdeUltimoRiego = diasEntre(ultimoRiego, ahora);
  const diasParaProximoRiego = frecuenciaDias - diasDesdeUltimoRiego;

  return {
    diasDesdeUltimoRiego,
    diasParaProximoRiego,
    necesitaRiego: diasParaProximoRiego <= 0,
    // Se pasó de la frecuencia en más de un 50%: conviene priorizarla
    urgente: diasDesdeUltimoRiego >= frecuenciaDias * 1.5,
  };
}
