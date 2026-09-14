import { PrismaClient } from "@prisma/client";
import { litrosEstimados } from "../src/lib/riego";

const prisma = new PrismaClient();

// Coordenadas de referencia en el oasis sur de Mendoza, para poder probar la
// sincronización de clima contra Open-Meteo sin cargar nada a mano.
const PARCELAS = [
  {
    nombre: "Lote 1 — Norte",
    superficieHa: 4.5,
    cultivo: "Maíz",
    tipoSuelo: "Franco",
    metodoRiego: "Pivote",
    caudalLh: 60000,
    frecuenciaDias: 4,
    etapaCultivo: "MEDIA",
    profundidadRaizM: 1,
    umbralAgotamiento: 0.5,
    potenciaBombaKw: 15,
    latitud: -34.6177,
    longitud: -68.3301,
    notas: "Sector con mejor drenaje, responde bien a riegos largos.",
  },
  {
    nombre: "Quinta Sur",
    superficieHa: 0.8,
    cultivo: "Hortalizas",
    tipoSuelo: "Arenoso",
    metodoRiego: "Goteo",
    caudalLh: 20000,
    frecuenciaDias: 2,
    etapaCultivo: "DESARROLLO",
    profundidadRaizM: 0.4,
    umbralAgotamiento: 0.4,
    potenciaBombaKw: 3,
    latitud: -34.6252,
    longitud: -68.3419,
    notas: null,
  },
  {
    nombre: "Viñedo Alto",
    superficieHa: 2.2,
    cultivo: "Vid",
    tipoSuelo: "Pedregoso",
    metodoRiego: "Goteo",
    caudalLh: 25000,
    frecuenciaDias: 7,
    etapaCultivo: "FINAL",
    profundidadRaizM: 1.2,
    umbralAgotamiento: 0.6,
    potenciaBombaKw: 5.5,
    latitud: -34.5988,
    longitud: -68.3702,
    notas: "Riego deficitario controlado durante la maduración.",
  },
  {
    nombre: "Olivar Camino Viejo",
    superficieHa: 6,
    cultivo: "Olivo",
    tipoSuelo: "Arcilloso",
    metodoRiego: "Microaspersión",
    caudalLh: 45000,
    frecuenciaDias: 10,
    etapaCultivo: "MEDIA",
    profundidadRaizM: 1.2,
    umbralAgotamiento: 0.55,
    potenciaBombaKw: 11,
    latitud: -34.5811,
    longitud: -68.3155,
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
  await prisma.climaDia.deleteMany();
  await prisma.riego.deleteMany();
  await prisma.parcela.deleteMany();

  await prisma.configuracion.upsert({
    where: { id: "default" },
    update: { etoDiariaMm: 5.2, precioKwh: 85, precioAguaM3: 12 },
    create: { id: "default", etoDiariaMm: 5.2, precioKwh: 85, precioAguaM3: 12 },
  });

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

  // Clima de los últimos 20 días: sin esto el balance hídrico arrancaría estimando
  let diasClima = 0;
  for (const [nombre, parcela] of creadas) {
    for (let atras = 20; atras >= 0; atras -= 1) {
      const dia = fecha(-atras, 0);
      // Serie sintética: ETo de verano con oscilación y alguna lluvia aislada
      const etoMm = Math.round((5.5 + Math.sin(atras / 2) * 1.6) * 10) / 10;
      const lluviaMm = atras % 7 === 3 ? 8 : 0;
      await prisma.climaDia.create({
        data: { parcelaId: parcela.id, fecha: dia, etoMm, lluviaMm, fuente: "OPEN_METEO" },
      });
      diasClima += 1;
    }
    void nombre;
  }

  console.log(
    `Datos de ejemplo cargados: ${PARCELAS.length} parcelas, ${riegos.length} riegos, ${diasClima} días de clima.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
