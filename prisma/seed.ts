import { PrismaClient } from "@prisma/client";
import { litrosEstimados } from "../src/lib/riego";

const prisma = new PrismaClient();

const PARCELAS = [
  {
    nombre: "Lote 1 — Norte",
    superficieHa: 4.5,
    cultivo: "Maíz",
    tipoSuelo: "Franco",
    metodoRiego: "Pivote",
    caudalLh: 18000,
    frecuenciaDias: 4,
    notas: "Sector con mejor drenaje, responde bien a riegos largos.",
  },
  {
    nombre: "Quinta Sur",
    superficieHa: 0.8,
    cultivo: "Hortalizas",
    tipoSuelo: "Arenoso",
    metodoRiego: "Goteo",
    caudalLh: 2400,
    frecuenciaDias: 2,
    notas: null,
  },
  {
    nombre: "Viñedo Alto",
    superficieHa: 2.2,
    cultivo: "Vid",
    tipoSuelo: "Pedregoso",
    metodoRiego: "Goteo",
    caudalLh: 3600,
    frecuenciaDias: 7,
    notas: "Riego deficitario controlado durante la maduración.",
  },
  {
    nombre: "Olivar Camino Viejo",
    superficieHa: 6,
    cultivo: "Olivo",
    tipoSuelo: "Arcilloso",
    metodoRiego: "Microaspersión",
    caudalLh: 9000,
    frecuenciaDias: 10,
    notas: null,
  },
];

/** Devuelve una fecha desplazada en días y fijada a una hora determinada. */
function fecha(diasDesdeHoy: number, hora: number) {
  const resultado = new Date();
  resultado.setDate(resultado.getDate() + diasDesdeHoy);
  resultado.setHours(hora, 0, 0, 0);
  return resultado;
}

async function main() {
  await prisma.riego.deleteMany();
  await prisma.parcela.deleteMany();

  const creadas = new Map<string, { id: string; caudalLh: number }>();
  for (const datos of PARCELAS) {
    const parcela = await prisma.parcela.create({ data: datos });
    creadas.set(parcela.nombre, { id: parcela.id, caudalLh: parcela.caudalLh });
  }

  // Riegos ya realizados (historial) y riegos programados hacia adelante
  const riegos: {
    parcela: string;
    dias: number;
    hora: number;
    duracionMin: number;
    estado: "COMPLETADO" | "PROGRAMADO";
    notas?: string;
  }[] = [
    { parcela: "Lote 1 — Norte", dias: -9, hora: 6, duracionMin: 120, estado: "COMPLETADO" },
    { parcela: "Lote 1 — Norte", dias: -5, hora: 6, duracionMin: 150, estado: "COMPLETADO" },
    { parcela: "Lote 1 — Norte", dias: 1, hora: 6, duracionMin: 120, estado: "PROGRAMADO" },
    { parcela: "Quinta Sur", dias: -4, hora: 7, duracionMin: 45, estado: "COMPLETADO" },
    { parcela: "Quinta Sur", dias: -2, hora: 7, duracionMin: 45, estado: "COMPLETADO" },
    {
      parcela: "Quinta Sur",
      dias: 0,
      hora: 19,
      duracionMin: 45,
      estado: "PROGRAMADO",
      notas: "Fertirriego",
    },
    { parcela: "Viñedo Alto", dias: -12, hora: 8, duracionMin: 180, estado: "COMPLETADO" },
    { parcela: "Viñedo Alto", dias: 2, hora: 8, duracionMin: 180, estado: "PROGRAMADO" },
    { parcela: "Olivar Camino Viejo", dias: -6, hora: 9, duracionMin: 240, estado: "COMPLETADO" },
  ];

  for (const riego of riegos) {
    const parcela = creadas.get(riego.parcela);
    if (!parcela) continue;
    await prisma.riego.create({
      data: {
        parcelaId: parcela.id,
        fechaHora: fecha(riego.dias, riego.hora),
        duracionMin: riego.duracionMin,
        estado: riego.estado,
        litros:
          riego.estado === "COMPLETADO"
            ? litrosEstimados(parcela.caudalLh, riego.duracionMin)
            : null,
        notas: riego.notas ?? null,
      },
    });
  }

  console.log(`Datos de ejemplo cargados: ${PARCELAS.length} parcelas, ${riegos.length} riegos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
