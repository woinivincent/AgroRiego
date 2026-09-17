import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bandejaVacia,
  cambiarEstado,
  filtrar,
  guardarMensaje,
  importar,
  resolverId,
  resumen,
} from "./bandeja";
import { type Mensaje, redactarMensaje } from "./mensajes";
import { type Prospecto, normalizarProspecto } from "./prospectos";

const REMITENTE = {
  nombre: "Vicente",
  rol: "fundador",
  empresa: "AgroRiego",
  email: "vicente@agroriego.com",
  telefono: "",
  sitio: "",
  enlaceDemo: "",
};

const productor = (extra: Record<string, string> = {}) =>
  normalizarProspecto({
    first_name: "Juan",
    last_name: "Pérez",
    job_title: "Owner",
    company_name: "Finca La Esperanza",
    professional_email: "juan@finca.com",
    linkedin_category: "Farming",
    ...extra,
  });

function conMensaje(prospecto: Prospecto): { bandeja: ReturnType<typeof bandejaVacia>; mensaje: Mensaje } {
  const { bandeja } = importar(bandejaVacia(), [prospecto]);
  const mensaje = redactarMensaje({ prospecto, remitente: REMITENTE });
  return { bandeja: guardarMensaje(bandeja, prospecto.id, mensaje), mensaje };
}

describe("importación a la bandeja", () => {
  it("encola cada prospecto como borrador", () => {
    const { bandeja, resultado } = importar(bandejaVacia(), [productor()]);
    assert.equal(resultado.nuevos, 1);
    assert.equal(Object.values(bandeja.entradas)[0].estado, "BORRADOR");
  });

  it("reimportar el mismo export no duplica: actualiza el borrador", () => {
    const primera = importar(bandejaVacia(), [productor()]);
    const segunda = importar(primera.bandeja, [productor({ job_title: "Dueño" })]);
    assert.equal(segunda.resultado.nuevos, 0);
    assert.equal(segunda.resultado.actualizados, 1);
    assert.equal(Object.keys(segunda.bandeja.entradas).length, 1);
  });

  it("no pisa lo que ya salió de borrador", () => {
    const prospecto = productor();
    const { bandeja } = conMensaje(prospecto);
    const aprobada = cambiarEstado(bandeja, prospecto.id, "APROBADO");
    const { bandeja: reimportada, resultado } = importar(aprobada, [productor({ job_title: "Otro" })]);

    assert.equal(resultado.intactos, 1);
    assert.equal(reimportada.entradas[prospecto.id].estado, "APROBADO");
    assert.equal(reimportada.entradas[prospecto.id].prospecto.cargo, "Owner");
  });
});

describe("transiciones de estado", () => {
  it("aprobar exige que el mensaje ya esté redactado", () => {
    const prospecto = productor();
    const { bandeja } = importar(bandejaVacia(), [prospecto]);
    assert.throws(() => cambiarEstado(bandeja, prospecto.id, "APROBADO"), /no tiene mensaje/);
  });

  it("no se puede marcar como enviado algo que nadie aprobó", () => {
    const prospecto = productor();
    const { bandeja } = conMensaje(prospecto);
    assert.throws(() => cambiarEstado(bandeja, prospecto.id, "ENVIADO"), /No se puede pasar/);
  });

  it("el camino completo queda registrado en el historial", () => {
    const prospecto = productor();
    const { bandeja } = conMensaje(prospecto);
    const aprobada = cambiarEstado(bandeja, prospecto.id, "APROBADO");
    const enviada = cambiarEstado(aprobada, prospecto.id, "ENVIADO", { nota: "mandado a mano" });

    const entrada = enviada.entradas[prospecto.id];
    assert.equal(entrada.estado, "ENVIADO");
    assert.deepEqual(
      entrada.historial.map((m) => m.estado),
      ["BORRADOR", "APROBADO", "ENVIADO"],
    );
    assert.equal(entrada.historial.at(-1)?.nota, "mandado a mano");
  });

  it("un descartado se puede reabrir", () => {
    const prospecto = productor();
    const { bandeja } = conMensaje(prospecto);
    const descartada = cambiarEstado(bandeja, prospecto.id, "DESCARTADO", { nota: "no es el perfil" });
    const reabierta = cambiarEstado(descartada, prospecto.id, "BORRADOR");
    assert.equal(reabierta.entradas[prospecto.id].estado, "BORRADOR");
  });

  it("un mensaje aprobado ya no se reescribe", () => {
    const prospecto = productor();
    const { bandeja, mensaje } = conMensaje(prospecto);
    const aprobada = cambiarEstado(bandeja, prospecto.id, "APROBADO");
    assert.throws(() => guardarMensaje(aprobada, prospecto.id, mensaje), /no se reescribe/);
  });
});

describe("consultas sobre la bandeja", () => {
  const armar = () => {
    const productores = [productor(), productor({ professional_email: "ana@vinedo.com", first_name: "Ana" })];
    const ajeno = normalizarProspecto({
      first_name: "Luis",
      professional_email: "luis@software.com",
      linkedin_category: "Software Development",
    });
    return importar(bandejaVacia(), [...productores, ajeno]).bandeja;
  };

  it("filtra por segmento", () => {
    assert.equal(filtrar(armar(), { segmento: "PRODUCTOR" }).length, 2);
  });

  it("busca por nombre, empresa o email", () => {
    assert.equal(filtrar(armar(), { busqueda: "vinedo" }).length, 1);
  });

  it("el resumen cuenta los borradores sin redactar", () => {
    const datos = resumen(armar());
    assert.equal(datos.total, 3);
    assert.equal(datos.conteo.BORRADOR, 3);
    assert.equal(datos.sinRedactar, 3);
  });

  it("acepta un prefijo de id, pero no uno ambiguo", () => {
    const prospecto = productor();
    const { bandeja } = importar(bandejaVacia(), [prospecto]);
    assert.equal(resolverId(bandeja, prospecto.id.slice(0, 4)), prospecto.id);
    assert.throws(() => resolverId(bandeja, "zzzz"), /No hay ningún prospecto/);
  });
});
