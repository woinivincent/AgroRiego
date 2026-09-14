"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { litrosEstimados } from "@/lib/riego";

export type EstadoAccion = { error?: string; ok?: boolean };

const RUTAS = ["/", "/parcelas", "/riegos", "/historial"];

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

  return {
    datos: {
      nombre,
      cultivo,
      tipoSuelo,
      metodoRiego,
      superficieHa,
      caudalLh,
      frecuenciaDias: Math.round(frecuenciaDias),
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

  revalidarTodo();
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
