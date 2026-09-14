"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { inicioDelDia, litrosEstimados } from "@/lib/riego";
import { buscarLocalidad, consultarClima, ErrorClima, type Localidad } from "@/lib/clima";

export type EstadoAccion = { error?: string; ok?: boolean };

const RUTAS = ["/", "/parcelas", "/riegos", "/historial", "/calculadora", "/configuracion"];

function revalidarTodo() {
  for (const ruta of RUTAS) revalidatePath(ruta);
}

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function numero(formData: FormData, campo: string) {
  const valor = texto(formData, campo).replace(",", ".");
  if (valor === "") return null;
  const parseado = Number(valor);
  return Number.isFinite(parseado) ? parseado : null;
}

function leerParcela(formData: FormData) {
  const nombre = texto(formData, "nombre");
  const cultivo = texto(formData, "cultivo");
  const tipoSuelo = texto(formData, "tipoSuelo");
  const metodoRiego = texto(formData, "metodoRiego");
  const superficieHa = numero(formData, "superficieHa");
  const caudalLh = numero(formData, "caudalLh");
  const frecuenciaDias = numero(formData, "frecuenciaDias");
  const etapaCultivo = texto(formData, "etapaCultivo") || "MEDIA";
  const profundidadRaizM = numero(formData, "profundidadRaizM");
  const umbralAgotamiento = numero(formData, "umbralAgotamiento");
  const potenciaBombaKw = numero(formData, "potenciaBombaKw");
  const latitud = numero(formData, "latitud");
  const longitud = numero(formData, "longitud");
  const notas = texto(formData, "notas");

  if (!nombre) return { error: "El nombre de la parcela es obligatorio." } as const;
  if (!cultivo) return { error: "Elegí un cultivo." } as const;
  if (!tipoSuelo) return { error: "Elegí el tipo de suelo." } as const;
  if (!metodoRiego) return { error: "Elegí el método de riego." } as const;
  if (superficieHa === null || superficieHa <= 0) {
    return { error: "La superficie tiene que ser un número mayor a 0." } as const;
  }
  if (caudalLh === null || caudalLh <= 0) {
    return { error: "El caudal tiene que ser un número mayor a 0." } as const;
  }
  if (frecuenciaDias === null || frecuenciaDias < 1) {
    return { error: "La frecuencia de riego tiene que ser de al menos 1 día." } as const;
  }
  if (profundidadRaizM === null || profundidadRaizM <= 0) {
    return { error: "La profundidad de raíces tiene que ser mayor a 0 m." } as const;
  }
  if (umbralAgotamiento === null || umbralAgotamiento <= 0 || umbralAgotamiento > 1) {
    return { error: "El umbral de agotamiento va entre 0 y 1 (por ejemplo 0,5)." } as const;
  }
  if (potenciaBombaKw !== null && potenciaBombaKw < 0) {
    return { error: "La potencia de la bomba no puede ser negativa." } as const;
  }
  // Las coordenadas son opcionales, pero si van, van las dos y dentro de rango
  if ((latitud === null) !== (longitud === null)) {
    return { error: "Cargá latitud y longitud juntas, o dejá las dos vacías." } as const;
  }
  if (latitud !== null && (latitud < -90 || latitud > 90)) {
    return { error: "La latitud va entre -90 y 90." } as const;
  }
  if (longitud !== null && (longitud < -180 || longitud > 180)) {
    return { error: "La longitud va entre -180 y 180." } as const;
  }

  return {
    datos: {
      nombre,
      cultivo,
      tipoSuelo,
      metodoRiego,
      superficieHa,
      caudalLh,
      frecuenciaDias: Math.round(frecuenciaDias),
      etapaCultivo,
      profundidadRaizM,
      umbralAgotamiento,
      potenciaBombaKw,
      latitud,
      longitud,
      encadenarRiegos: formData.get("encadenarRiegos") !== null,
      activa: formData.get("activa") !== null,
      notas: notas || null,
    },
  } as const;
}

export async function crearParcela(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const leido = leerParcela(formData);
  if ("error" in leido) return { error: leido.error };

  const existente = await prisma.parcela.findUnique({ where: { nombre: leido.datos.nombre } });
  if (existente) return { error: `Ya existe una parcela llamada "${leido.datos.nombre}".` };

  await prisma.parcela.create({ data: leido.datos });
  revalidarTodo();
  return { ok: true };
}

export async function actualizarParcela(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const id = texto(formData, "id");
  if (!id) return { error: "No se encontró la parcela a editar." };

  const leido = leerParcela(formData);
  if ("error" in leido) return { error: leido.error };

  const existente = await prisma.parcela.findUnique({ where: { nombre: leido.datos.nombre } });
  if (existente && existente.id !== id) {
    return { error: `Ya existe otra parcela llamada "${leido.datos.nombre}".` };
  }

  await prisma.parcela.update({ where: { id }, data: leido.datos });
  revalidarTodo();
  return { ok: true };
}

export async function eliminarParcela(formData: FormData) {
  const id = texto(formData, "id");
  if (!id) return;
  // Los riegos asociados se borran en cascada (ver schema.prisma)
  await prisma.parcela.delete({ where: { id } });
  revalidarTodo();
}

export async function programarRiego(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const parcelaId = texto(formData, "parcelaId");
  const fechaHoraTexto = texto(formData, "fechaHora");
  const duracionMin = numero(formData, "duracionMin");
  const notas = texto(formData, "notas");
  // Permite cargar un riego ya realizado en lugar de uno futuro
  const yaRealizado = formData.get("yaRealizado") !== null;

  if (!parcelaId) return { error: "Elegí una parcela." };
  if (!fechaHoraTexto) return { error: "Indicá la fecha y hora del riego." };

  const fechaHora = new Date(fechaHoraTexto);
  if (Number.isNaN(fechaHora.getTime())) return { error: "La fecha y hora no son válidas." };
  if (duracionMin === null || duracionMin <= 0) {
    return { error: "La duración tiene que ser mayor a 0 minutos." };
  }

  const parcela = await prisma.parcela.findUnique({ where: { id: parcelaId } });
  if (!parcela) return { error: "La parcela seleccionada ya no existe." };

  const minutos = Math.round(duracionMin);
  await prisma.riego.create({
    data: {
      parcelaId,
      fechaHora,
      duracionMin: minutos,
      estado: yaRealizado ? "COMPLETADO" : "PROGRAMADO",
      litros: yaRealizado ? litrosEstimados(parcela.caudalLh, minutos) : null,
      notas: notas || null,
    },
  });

  revalidarTodo();
  return { ok: true };
}

export async function completarRiego(formData: FormData) {
  const id = texto(formData, "id");
  if (!id) return;

  const riego = await prisma.riego.findUnique({ where: { id }, include: { parcela: true } });
  if (!riego) return;

  const litrosIngresados = numero(formData, "litros");
  await prisma.riego.update({
    where: { id },
    data: {
      estado: "COMPLETADO",
      litros:
        litrosIngresados && litrosIngresados > 0
          ? litrosIngresados
          : litrosEstimados(riego.parcela.caudalLh, riego.duracionMin),
    },
  });

  if (riego.parcela.encadenarRiegos) await agendarProximoRiego(riego.parcela.id);

  revalidarTodo();
}

/**
 * Agenda el siguiente riego de una parcela a partir de su último riego
 * completado más la frecuencia configurada. No hace nada si ya hay uno
 * programado: el plan nunca duplica riegos.
 */
async function agendarProximoRiego(parcelaId: string) {
  const parcela = await prisma.parcela.findUnique({ where: { id: parcelaId } });
  if (!parcela || !parcela.activa) return null;

  const yaProgramado = await prisma.riego.findFirst({
    where: { parcelaId, estado: "PROGRAMADO" },
  });
  if (yaProgramado) return null;

  const ultimo = await prisma.riego.findFirst({
    where: { parcelaId, estado: "COMPLETADO" },
    orderBy: { fechaHora: "desc" },
  });

  const base = ultimo?.fechaHora ?? new Date();
  const fechaHora = new Date(base);
  fechaHora.setDate(fechaHora.getDate() + parcela.frecuenciaDias);

  // Un riego agendado en el pasado no sirve de recordatorio: lo corremos a hoy
  const ahora = new Date();
  if (fechaHora < ahora) {
    fechaHora.setTime(inicioDelDia(ahora).getTime());
    fechaHora.setHours(base.getHours(), base.getMinutes(), 0, 0);
  }

  return prisma.riego.create({
    data: {
      parcelaId,
      fechaHora,
      duracionMin: ultimo?.duracionMin ?? 60,
      estado: "PROGRAMADO",
      notas: "Agendado automáticamente según la frecuencia de la parcela",
    },
  });
}

/**
 * Genera el plan de riego de los próximos 7 días para todas las parcelas
 * activas que no tengan ya un riego programado. Devuelve cuántos creó.
 */
export async function generarPlanSemanal(): Promise<EstadoAccion & { creados?: number }> {
  const parcelas = await prisma.parcela.findMany({ where: { activa: true } });
  let creados = 0;

  for (const parcela of parcelas) {
    const riego = await agendarProximoRiego(parcela.id);
    if (!riego) continue;
    // Sólo cuentan los que caen dentro de la semana que viene
    const limite = new Date();
    limite.setDate(limite.getDate() + 7);
    if (riego.fechaHora > limite) {
      await prisma.riego.delete({ where: { id: riego.id } });
      continue;
    }
    creados += 1;
  }

  revalidarTodo();
  return creados > 0
    ? { ok: true, creados }
    : { error: "No había riegos nuevos para agendar esta semana.", creados: 0 };
}

export async function cancelarRiego(formData: FormData) {
  const id = texto(formData, "id");
  if (!id) return;
  await prisma.riego.update({ where: { id }, data: { estado: "CANCELADO", litros: null } });
  revalidarTodo();
}

export async function eliminarRiego(formData: FormData) {
  const id = texto(formData, "id");
  if (!id) return;
  await prisma.riego.delete({ where: { id } });
  revalidarTodo();
}

export async function guardarConfiguracion(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const etoDiariaMm = numero(formData, "etoDiariaMm");
  const precioKwh = numero(formData, "precioKwh");
  const precioAguaM3 = numero(formData, "precioAguaM3");

  if (etoDiariaMm === null || etoDiariaMm <= 0) {
    return { error: "La ETo de referencia tiene que ser mayor a 0 mm/día." };
  }
  if (precioKwh === null || precioKwh < 0) return { error: "El precio del kWh no puede ser negativo." };
  if (precioAguaM3 === null || precioAguaM3 < 0) {
    return { error: "El precio del agua no puede ser negativo." };
  }

  await prisma.configuracion.upsert({
    where: { id: "default" },
    update: { etoDiariaMm, precioKwh, precioAguaM3 },
    create: { id: "default", etoDiariaMm, precioKwh, precioAguaM3 },
  });

  revalidarTodo();
  return { ok: true };
}

export type EstadoClima = EstadoAccion & { sincronizados?: number; localidades?: Localidad[] };

/**
 * Baja de Open-Meteo la ETo y la lluvia de la parcela y las guarda en caché.
 * Los días cargados a mano no se pisan: el dato del productor manda sobre el
 * de la API.
 */
export async function sincronizarClima(
  _prev: EstadoClima,
  formData: FormData,
): Promise<EstadoClima> {
  const parcelaId = texto(formData, "parcelaId");
  if (!parcelaId) return { error: "Elegí una parcela." };

  const parcela = await prisma.parcela.findUnique({ where: { id: parcelaId } });
  if (!parcela) return { error: "La parcela ya no existe." };
  if (parcela.latitud === null || parcela.longitud === null) {
    return { error: `Cargá las coordenadas de "${parcela.nombre}" para poder traer el clima.` };
  }

  // Una ventana amplia hacia atrás cubre el balance incluso con riegos espaciados
  const desde = new Date();
  desde.setDate(desde.getDate() - 30);
  const hasta = new Date();

  let dias;
  try {
    dias = await consultarClima(parcela.latitud, parcela.longitud, desde, hasta);
  } catch (error) {
    if (error instanceof ErrorClima) return { error: error.message };
    throw error;
  }

  if (dias.length === 0) {
    return { error: "El servicio de clima no devolvió datos para esas coordenadas." };
  }

  const manuales = await prisma.climaDia.findMany({
    where: { parcelaId, fuente: "MANUAL" },
    select: { fecha: true },
  });
  const fechasManuales = new Set(manuales.map((dia) => dia.fecha.getTime()));

  let sincronizados = 0;
  for (const dia of dias) {
    // La API devuelve la fecha como YYYY-MM-DD: la anclamos al día local
    const [anio, mes, jornada] = dia.fecha.split("-").map(Number);
    if (!anio || !mes || !jornada) continue;
    const fecha = new Date(anio, mes - 1, jornada);
    if (fechasManuales.has(fecha.getTime())) continue;

    await prisma.climaDia.upsert({
      where: { parcelaId_fecha: { parcelaId, fecha } },
      update: { etoMm: dia.etoMm, lluviaMm: dia.lluviaMm, fuente: "OPEN_METEO", obtenidoEn: new Date() },
      create: { parcelaId, fecha, etoMm: dia.etoMm, lluviaMm: dia.lluviaMm, fuente: "OPEN_METEO" },
    });
    sincronizados += 1;
  }

  revalidarTodo();
  return { ok: true, sincronizados };
}

/** Carga o corrige a mano el clima de un día: pisa y bloquea el dato de la API. */
export async function guardarClimaManual(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const parcelaId = texto(formData, "parcelaId");
  const fechaTexto = texto(formData, "fecha");
  const etoMm = numero(formData, "etoMm");
  const lluviaMm = numero(formData, "lluviaMm");

  if (!parcelaId) return { error: "Elegí una parcela." };
  if (!fechaTexto) return { error: "Indicá la fecha del dato." };
  if (etoMm === null || etoMm < 0) return { error: "La ETo tiene que ser 0 o mayor." };
  if (lluviaMm === null || lluviaMm < 0) return { error: "La lluvia tiene que ser 0 o mayor." };

  const [anio, mes, jornada] = fechaTexto.split("-").map(Number);
  if (!anio || !mes || !jornada) return { error: "La fecha no es válida." };
  const fecha = new Date(anio, mes - 1, jornada);

  await prisma.climaDia.upsert({
    where: { parcelaId_fecha: { parcelaId, fecha } },
    update: { etoMm, lluviaMm, fuente: "MANUAL", obtenidoEn: new Date() },
    create: { parcelaId, fecha, etoMm, lluviaMm, fuente: "MANUAL" },
  });

  revalidarTodo();
  return { ok: true };
}

/** Busca coordenadas por nombre de localidad (la llamada queda del lado del servidor). */
export async function buscarCoordenadas(
  _prev: EstadoClima,
  formData: FormData,
): Promise<EstadoClima> {
  const nombre = texto(formData, "localidad");
  if (nombre.length < 2) return { error: "Escribí al menos dos letras." };

  try {
    const localidades = await buscarLocalidad(nombre);
    return localidades.length > 0
      ? { ok: true, localidades }
      : { error: `No se encontró ninguna localidad que coincida con "${nombre}".` };
  } catch (error) {
    if (error instanceof ErrorClima) return { error: error.message };
    throw error;
  }
}
