import { prisma } from "@/lib/prisma";
import {
  estadoHidrico,
  finDeSemana,
  inicioDeMes,
  inicioDeSemana,
  type EstadoHidrico,
} from "@/lib/riego";
import { calcularBalance, type Balance } from "@/lib/balance";
import type { ClimaDia, Configuracion, Parcela, Riego } from "@prisma/client";

export type ParcelaConEstado = Parcela & {
  ultimoRiego: Date | null;
  proximoRiego: Date | null;
  litrosTotales: number;
  riegosCompletados: number;
  estado: EstadoHidrico;
  balance: Balance;
};

/** La configuración es una fila única; se crea con los valores por defecto. */
export async function obtenerConfiguracion(): Promise<Configuracion> {
  return prisma.configuracion.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export type RiegoConParcela = Riego & { parcela: Parcela };

/** Parcelas con su último riego, el próximo programado y el acumulado de agua. */
/**
 * Resumen por parcela que necesita el panel, resuelto en la base.
 *
 * Antes esto traía todos los riegos y todos los días de clima de todas las
 * parcelas a memoria para recién ahí calcular: con 200 parcelas y 10.000 riegos
 * tardaba más de 400 ms. Ahora la base hace el filtrado y la agregación —que es
 * lo caro— y el balance se sigue calculando en TypeScript, donde está testeado.
 */
type FilaResumenParcela = {
  id: string;
  // Prisma mapea a Date las columnas que selecciona directo, pero no las
  // calculadas: MAX() y MIN() sobre un DateTime de SQLite vuelven como BigInt.
  ultimoRiego: bigint | number | Date | null;
  proximoRiego: bigint | number | Date | null;
  litrosTotales: bigint | number | null;
  riegosCompletados: bigint | number | null;
};

function aFecha(valor: bigint | number | Date | null): Date | null {
  if (valor === null) return null;
  if (valor instanceof Date) return valor;
  return new Date(Number(valor));
}

async function resumenDeRiegosPorParcela(ahora: Date) {
  const filas = await prisma.$queryRaw<FilaResumenParcela[]>`
    SELECT
      p.id AS id,
      (SELECT MAX(r.fechaHora) FROM Riego r
        WHERE r.parcelaId = p.id AND r.estado = 'COMPLETADO') AS ultimoRiego,
      (SELECT MIN(r.fechaHora) FROM Riego r
        WHERE r.parcelaId = p.id AND r.estado = 'PROGRAMADO'
          AND r.fechaHora >= ${ahora.getTime()}) AS proximoRiego,
      (SELECT SUM(COALESCE(r.litros, 0)) FROM Riego r
        WHERE r.parcelaId = p.id AND r.estado = 'COMPLETADO') AS litrosTotales,
      (SELECT COUNT(*) FROM Riego r
        WHERE r.parcelaId = p.id AND r.estado = 'COMPLETADO') AS riegosCompletados
    FROM Parcela p
  `;
  return new Map(filas.map((fila) => [fila.id, fila]));
}

type FilaClima = { parcelaId: string; fecha: Date; etoMm: number; lluviaMm: number; fuente: string };

/**
 * Trae sólo los días de clima que cada parcela necesita: los posteriores a su
 * último riego completado, o los de su última frecuencia si nunca se regó.
 * La ventana es distinta para cada parcela, así que no se puede expresar con
 * el query builder de Prisma.
 */
async function climaRelevantePorParcela(ahora: Date) {
  const filas = await prisma.$queryRaw<FilaClima[]>`
    SELECT c.parcelaId, c.fecha, c.etoMm, c.lluviaMm, c.fuente
    FROM ClimaDia c
    JOIN Parcela p ON p.id = c.parcelaId
    LEFT JOIN (
      SELECT parcelaId, MAX(fechaHora) AS ultimaFecha
      FROM Riego WHERE estado = 'COMPLETADO' GROUP BY parcelaId
    ) u ON u.parcelaId = c.parcelaId
    WHERE c.fecha <= ${ahora.getTime()}
      AND c.fecha > COALESCE(u.ultimaFecha, ${ahora.getTime()} - p.frecuenciaDias * 86400000)
    ORDER BY c.fecha ASC
  `;

  const porParcela = new Map<string, FilaClima[]>();
  for (const fila of filas) {
    const lista = porParcela.get(fila.parcelaId);
    if (lista) lista.push(fila);
    else porParcela.set(fila.parcelaId, [fila]);
  }
  return porParcela;
}

export async function obtenerParcelasConEstado(ahora = new Date()): Promise<ParcelaConEstado[]> {
  const [parcelas, configuracion, resumenRiegos, climaPorParcela] = await Promise.all([
    prisma.parcela.findMany({ orderBy: { nombre: "asc" } }),
    obtenerConfiguracion(),
    resumenDeRiegosPorParcela(ahora),
    climaRelevantePorParcela(ahora),
  ]);

  return parcelas.map((parcela) => {
    const resumen = resumenRiegos.get(parcela.id);
    const ultimoRiego = aFecha(resumen?.ultimoRiego ?? null);
    const clima = climaPorParcela.get(parcela.id) ?? [];

    return {
      ...parcela,
      ultimoRiego,
      proximoRiego: aFecha(resumen?.proximoRiego ?? null),
      litrosTotales: Number(resumen?.litrosTotales ?? 0),
      riegosCompletados: Number(resumen?.riegosCompletados ?? 0),
      estado: estadoHidrico(ultimoRiego, parcela.frecuenciaDias, ahora),
      balance: calcularBalance({ parcela, clima, configuracion, ultimoRiego, ahora }),
    };
  });
}

export type DatosCalculadora = {
  parcelas: Parcela[];
  configuracion: Configuracion;
  clima: ClimaDia[];
  ultimoRiego: Date | null;
};

/** Todo lo que la calculadora necesita para una parcela: clima, config y último riego. */
export async function obtenerDatosCalculadora(parcelaId?: string): Promise<DatosCalculadora> {
  const [parcelas, configuracion] = await Promise.all([obtenerParcelas(), obtenerConfiguracion()]);
  const elegida = parcelas.find((parcela) => parcela.id === parcelaId) ?? parcelas[0];

  if (!elegida) return { parcelas, configuracion, clima: [], ultimoRiego: null };

  const ultimo = await prisma.riego.findFirst({
    where: { parcelaId: elegida.id, estado: "COMPLETADO" },
    orderBy: { fechaHora: "desc" },
  });

  // Sólo los días posteriores al último riego entran en el balance; sin riegos
  // previos alcanza con la última frecuencia de la parcela.
  const desde = ultimo?.fechaHora ?? new Date(Date.now() - elegida.frecuenciaDias * 86_400_000);
  const clima = await prisma.climaDia.findMany({
    where: { parcelaId: elegida.id, fecha: { gt: desde } },
    orderBy: { fecha: "asc" },
  });

  return { parcelas, configuracion, clima, ultimoRiego: ultimo?.fechaHora ?? null };
}

export async function obtenerParcelas() {
  return prisma.parcela.findMany({ orderBy: { nombre: "asc" } });
}

export async function obtenerParcela(id: string) {
  return prisma.parcela.findUnique({ where: { id } });
}

export async function obtenerRiegosProgramados(): Promise<RiegoConParcela[]> {
  return prisma.riego.findMany({
    where: { estado: "PROGRAMADO" },
    include: { parcela: true },
    orderBy: { fechaHora: "asc" },
  });
}

export async function obtenerHistorial(parcelaId?: string): Promise<RiegoConParcela[]> {
  return prisma.riego.findMany({
    where: {
      estado: { in: ["COMPLETADO", "CANCELADO"] },
      ...(parcelaId ? { parcelaId } : {}),
    },
    include: { parcela: true },
    orderBy: { fechaHora: "desc" },
    take: 200,
  });
}

export type Resumen = {
  parcelas: ParcelaConEstado[];
  parcelasActivas: number;
  superficieTotal: number;
  riegosSemana: number;
  riegosCompletadosSemana: number;
  litrosSemana: number;
  litrosMes: number;
  litrosTotales: number;
  pendientes: ParcelaConEstado[];
  proximosRiegos: RiegoConParcela[];
  riegosAtrasados: RiegoConParcela[];
};

/** Métricas del panel principal. */
export async function obtenerResumen(ahora = new Date()): Promise<Resumen> {
  const parcelas = await obtenerParcelasConEstado(ahora);
  const desdeSemana = inicioDeSemana(ahora);
  const hastaSemana = finDeSemana(ahora);
  const desdeMes = inicioDeMes(ahora);

  // Agregar en la base en vez de traer las filas para sumarlas acá: estas
  // consultas crecen con el historial completo, que no tiene techo.
  const [porEstadoSemana, litrosMes, completadosTotales, atrasados, proximos] = await Promise.all([
    prisma.riego.groupBy({
      by: ["estado"],
      where: { fechaHora: { gte: desdeSemana, lt: hastaSemana }, estado: { not: "CANCELADO" } },
      _count: { _all: true },
      _sum: { litros: true },
    }),
    prisma.riego.aggregate({
      where: { fechaHora: { gte: desdeMes }, estado: "COMPLETADO" },
      _sum: { litros: true },
    }),
    prisma.riego.aggregate({ where: { estado: "COMPLETADO" }, _sum: { litros: true } }),
    // El panel muestra los atrasados completos y sólo los seis próximos: traer
    // todos los programados con su parcela era cargar cientos de filas para
    // mostrar seis.
    prisma.riego.findMany({
      where: { estado: "PROGRAMADO", fechaHora: { lt: ahora } },
      include: { parcela: true },
      orderBy: { fechaHora: "asc" },
    }),
    prisma.riego.findMany({
      where: { estado: "PROGRAMADO", fechaHora: { gte: ahora } },
      include: { parcela: true },
      orderBy: { fechaHora: "asc" },
      take: 6,
    }),
  ]);

  const completadosSemana = porEstadoSemana.find((grupo) => grupo.estado === "COMPLETADO");
  const riegosSemana = porEstadoSemana.reduce((total, grupo) => total + grupo._count._all, 0);

  return {
    parcelas,
    parcelasActivas: parcelas.filter((parcela) => parcela.activa).length,
    superficieTotal: parcelas
      .filter((parcela) => parcela.activa)
      .reduce((total, parcela) => total + parcela.superficieHa, 0),
    riegosSemana,
    riegosCompletadosSemana: completadosSemana?._count._all ?? 0,
    litrosSemana: completadosSemana?._sum.litros ?? 0,
    litrosMes: litrosMes._sum.litros ?? 0,
    litrosTotales: completadosTotales._sum.litros ?? 0,
    // Una parcela que ya tiene su riego agendado no es una pendiente: si no,
    // seguiría reclamando atención después de haberla resuelto.
    pendientes: parcelas
      .filter((parcela) => parcela.activa && parcela.estado.necesitaRiego && !parcela.proximoRiego)
      .sort((a, b) => (b.estado.diasDesdeUltimoRiego ?? 999) - (a.estado.diasDesdeUltimoRiego ?? 999)),
    proximosRiegos: proximos,
    riegosAtrasados: atrasados,
  };
}
