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
export async function obtenerParcelasConEstado(ahora = new Date()): Promise<ParcelaConEstado[]> {
  const [parcelas, configuracion] = await Promise.all([
    prisma.parcela.findMany({
      orderBy: { nombre: "asc" },
      include: {
        riegos: { orderBy: { fechaHora: "desc" } },
        clima: { orderBy: { fecha: "asc" } },
      },
    }),
    obtenerConfiguracion(),
  ]);

  return parcelas.map(({ riegos, clima, ...parcela }) => {
    const completados = riegos.filter((riego) => riego.estado === "COMPLETADO");
    const programadosFuturos = riegos
      .filter((riego) => riego.estado === "PROGRAMADO" && riego.fechaHora >= ahora)
      .sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime());

    const ultimoRiego = completados[0]?.fechaHora ?? null;

    return {
      ...parcela,
      ultimoRiego,
      proximoRiego: programadosFuturos[0]?.fechaHora ?? null,
      litrosTotales: completados.reduce((total, riego) => total + (riego.litros ?? 0), 0),
      riegosCompletados: completados.length,
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

  const [clima, ultimo] = await Promise.all([
    prisma.climaDia.findMany({ where: { parcelaId: elegida.id }, orderBy: { fecha: "asc" } }),
    prisma.riego.findFirst({
      where: { parcelaId: elegida.id, estado: "COMPLETADO" },
      orderBy: { fechaHora: "desc" },
    }),
  ]);

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

  const [riegosSemana, riegosMes, completadosTotales, programados] = await Promise.all([
    prisma.riego.findMany({
      where: { fechaHora: { gte: desdeSemana, lt: hastaSemana }, estado: { not: "CANCELADO" } },
    }),
    prisma.riego.findMany({
      where: { fechaHora: { gte: desdeMes }, estado: "COMPLETADO" },
    }),
    prisma.riego.aggregate({ where: { estado: "COMPLETADO" }, _sum: { litros: true } }),
    prisma.riego.findMany({
      where: { estado: "PROGRAMADO" },
      include: { parcela: true },
      orderBy: { fechaHora: "asc" },
    }),
  ]);

  const sumarLitros = (riegos: { litros: number | null }[]) =>
    riegos.reduce((total, riego) => total + (riego.litros ?? 0), 0);

  return {
    parcelas,
    parcelasActivas: parcelas.filter((parcela) => parcela.activa).length,
    superficieTotal: parcelas
      .filter((parcela) => parcela.activa)
      .reduce((total, parcela) => total + parcela.superficieHa, 0),
    riegosSemana: riegosSemana.length,
    riegosCompletadosSemana: riegosSemana.filter((riego) => riego.estado === "COMPLETADO").length,
    litrosSemana: sumarLitros(riegosSemana.filter((riego) => riego.estado === "COMPLETADO")),
    litrosMes: sumarLitros(riegosMes),
    litrosTotales: completadosTotales._sum.litros ?? 0,
    pendientes: parcelas
      .filter((parcela) => parcela.activa && parcela.estado.necesitaRiego)
      .sort((a, b) => (b.estado.diasDesdeUltimoRiego ?? 999) - (a.estado.diasDesdeUltimoRiego ?? 999)),
    proximosRiegos: programados.filter((riego) => riego.fechaHora >= ahora).slice(0, 6),
    riegosAtrasados: programados.filter((riego) => riego.fechaHora < ahora),
  };
}
