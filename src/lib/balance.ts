import type { Configuracion, Parcela } from "@prisma/client";
import {
  aguaUtilTotalMm,
  aplicacionDesdeLamina,
  costoAplicacion,
  deficitAcumuladoMm,
  eficiencia,
  kc,
  laminaMaximaMm,
  lluviaEfectivaMm,
  type Aplicacion,
  type Costo,
} from "@/lib/agronomia";
import { diasEntre } from "@/lib/riego";

/** De dónde salió la ETo usada en el cálculo. */
export type FuenteClima = "OPEN_METEO" | "MANUAL" | "MIXTA" | "ESTIMADO";

export type Balance = {
  diasDesdeUltimoRiego: number;
  diasConDatoReal: number;
  fuenteClima: FuenteClima;
  coeficienteCultivo: number;
  etoAcumuladaMm: number;
  lluviaEfectivaAcumuladaMm: number;
  /** Lámina neta que el cultivo consumió y hay que reponer. */
  deficitMm: number;
  aguaUtilTotalMm: number;
  /** Tope de reposición: más que esto percola bajo la zona de raíces. */
  laminaMaximaMm: number;
  /** Cuánto del agua disponible ya se agotó, 0 a 1 (puede pasar de 1). */
  agotamiento: number;
  necesitaRiego: boolean;
  /** Lámina a aplicar recomendada, acotada al tope del suelo. */
  laminaSugeridaMm: number;
  aplicacion: Aplicacion;
  costo: Costo;
  eficienciaMetodo: number;
  /** true si la parcela tiene una eficiencia medida en vez del valor de diseño. */
  eficienciaEsMedida: boolean;
};

/** Un día de clima reducido a lo que el balance necesita. */
export type DiaBalance = { fecha: Date; etoMm: number; lluviaMm: number; fuente: string };

function resolverFuente(dias: DiaBalance[], huboEstimacion: boolean): FuenteClima {
  if (dias.length === 0) return "ESTIMADO";
  const fuentes = new Set(dias.map((dia) => dia.fuente));
  if (huboEstimacion || fuentes.size > 1) return "MIXTA";
  return fuentes.has("MANUAL") ? "MANUAL" : "OPEN_METEO";
}

/**
 * Balance hídrico de una parcela desde su último riego completado.
 *
 * Los días sin dato de clima se completan con la ETo de referencia de la
 * configuración, para que el cálculo nunca quede en cero por falta de datos;
 * `fuenteClima` avisa cuándo pasó eso.
 */
export function calcularBalance({
  parcela,
  clima,
  configuracion,
  ultimoRiego,
  ahora = new Date(),
  laminaObjetivoMm,
}: {
  parcela: Parcela;
  clima: DiaBalance[];
  configuracion: Configuracion;
  ultimoRiego: Date | null;
  ahora?: Date;
  /** Sobrescribe la lámina sugerida, para simular en la calculadora. */
  laminaObjetivoMm?: number;
}): Balance {
  // Sin riegos previos tomamos un ciclo completo de su frecuencia como arranque
  const diasDesdeUltimoRiego = ultimoRiego
    ? Math.max(0, diasEntre(ultimoRiego, ahora))
    : parcela.frecuenciaDias;

  const coeficienteCultivo = kc(parcela.cultivo, parcela.etapaCultivo);

  const diasRelevantes = ultimoRiego
    ? clima.filter((dia) => dia.fecha > ultimoRiego && dia.fecha <= ahora)
    : clima.filter((dia) => dia.fecha <= ahora).slice(-parcela.frecuenciaDias);

  const diasFaltantes = Math.max(0, diasDesdeUltimoRiego - diasRelevantes.length);
  const estimados = Array.from({ length: diasFaltantes }, () => ({
    etoMm: configuracion.etoDiariaMm,
    lluviaMm: 0,
  }));

  const serie = [...diasRelevantes.map((dia) => ({ etoMm: dia.etoMm, lluviaMm: dia.lluviaMm })), ...estimados];

  const etoAcumuladaMm = serie.reduce((total, dia) => total + dia.etoMm, 0);
  const lluviaEfectivaAcumuladaMm = serie.reduce(
    (total, dia) => total + lluviaEfectivaMm(dia.lluviaMm),
    0,
  );
  const deficitMm = deficitAcumuladoMm(serie, coeficienteCultivo);

  const aguaUtil = aguaUtilTotalMm(parcela.tipoSuelo, parcela.profundidadRaizM);
  const laminaMaxima = laminaMaximaMm(
    parcela.tipoSuelo,
    parcela.profundidadRaizM,
    parcela.umbralAgotamiento,
  );

  const laminaSugeridaMm =
    laminaObjetivoMm !== undefined ? laminaObjetivoMm : Math.min(deficitMm, laminaMaxima);

  const aplicacion = aplicacionDesdeLamina({
    laminaNetaMm: laminaSugeridaMm,
    superficieHa: parcela.superficieHa,
    caudalLh: parcela.caudalLh,
    metodoRiego: parcela.metodoRiego,
    eficienciaPropia: parcela.eficienciaRiego,
  });

  return {
    diasDesdeUltimoRiego,
    diasConDatoReal: diasRelevantes.length,
    fuenteClima: resolverFuente(diasRelevantes, diasFaltantes > 0),
    coeficienteCultivo,
    etoAcumuladaMm,
    lluviaEfectivaAcumuladaMm,
    deficitMm,
    aguaUtilTotalMm: aguaUtil,
    laminaMaximaMm: laminaMaxima,
    agotamiento: laminaMaxima > 0 ? deficitMm / laminaMaxima : 0,
    necesitaRiego: laminaMaxima > 0 && deficitMm >= laminaMaxima,
    laminaSugeridaMm,
    aplicacion,
    costo: costoAplicacion({
      litros: aplicacion.litros,
      minutos: aplicacion.minutos,
      potenciaBombaKw: parcela.potenciaBombaKw,
      precioKwh: configuracion.precioKwh,
      precioAguaM3: configuracion.precioAguaM3,
    }),
    eficienciaMetodo: eficiencia(parcela.metodoRiego, parcela.eficienciaRiego),
    eficienciaEsMedida: Boolean(parcela.eficienciaRiego),
  };
}
