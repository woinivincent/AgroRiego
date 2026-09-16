import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { AddressInfo } from "node:net";
import { buscarLocalidad, consultarClima, ErrorClima } from "./clima";

// Estas pruebas levantan un servidor local que imita a Open-Meteo. No validan
// que la API real siga devolviendo esta forma —para eso está `npm run
// clima:probar`, que le pega de verdad— sino que nuestro cliente la interpreta
// bien y falla con un mensaje útil cuando la respuesta no es la esperada.

let servidor: Server;
let respuesta: { estado: number; cuerpo: string } = { estado: 200, cuerpo: "{}" };

// Recorte real de lo que devuelve el endpoint de pronóstico
const RESPUESTA_TIPICA = JSON.stringify({
  latitude: -34.625,
  longitude: -68.33,
  timezone: "America/Argentina/Mendoza",
  daily_units: { et0_fao_evapotranspiration: "mm", precipitation_sum: "mm" },
  daily: {
    time: ["2026-09-11", "2026-09-12", "2026-09-13"],
    et0_fao_evapotranspiration: [4.32, 5.18, 3.97],
    precipitation_sum: [0, 11.4, 0.2],
  },
});

before(async () => {
  servidor = createServer((_peticion, salida) => {
    salida.writeHead(respuesta.estado, { "content-type": "application/json" });
    salida.end(respuesta.cuerpo);
  });
  await new Promise<void>((listo) => servidor.listen(0, "127.0.0.1", listo));
  const { port } = servidor.address() as AddressInfo;
  process.env.OPEN_METEO_URL = `http://127.0.0.1:${port}/forecast`;
  process.env.OPEN_METEO_GEOCODING_URL = `http://127.0.0.1:${port}/search`;
});

after(() => servidor.close());

const ayer = new Date(Date.now() - 86_400_000);
const hoy = new Date();

describe("consultarClima", () => {
  it("interpreta la respuesta de Open-Meteo", async () => {
    respuesta = { estado: 200, cuerpo: RESPUESTA_TIPICA };
    const dias = await consultarClima(-34.625, -68.33, ayer, hoy);
    assert.equal(dias.length, 3);
    assert.deepEqual(dias[0], { fecha: "2026-09-11", etoMm: 4.32, lluviaMm: 0 });
    assert.equal(dias[1]?.lluviaMm, 11.4);
  });

  it("descarta los días que todavía no tienen ETo calculada", async () => {
    respuesta = {
      estado: 200,
      cuerpo: JSON.stringify({
        daily: {
          time: ["2026-09-11", "2026-09-12"],
          et0_fao_evapotranspiration: [4.32, null],
          precipitation_sum: [0, 0],
        },
      }),
    };
    const dias = await consultarClima(-34.6, -68.3, ayer, hoy);
    assert.equal(dias.length, 1);
    assert.equal(dias[0]?.fecha, "2026-09-11");
  });

  it("toma la lluvia como cero si la API no la manda", async () => {
    respuesta = {
      estado: 200,
      cuerpo: JSON.stringify({
        daily: { time: ["2026-09-11"], et0_fao_evapotranspiration: [4.32] },
      }),
    };
    const dias = await consultarClima(-34.6, -68.3, ayer, hoy);
    assert.equal(dias[0]?.lluviaMm, 0);
  });

  it("avisa si falta la evapotranspiración, en vez de devolver una serie vacía", async () => {
    respuesta = {
      estado: 200,
      cuerpo: JSON.stringify({ daily: { time: ["2026-09-11"], temperature_2m_max: [24] } }),
    };
    await assert.rejects(
      () => consultarClima(-34.6, -68.3, ayer, hoy),
      (error: Error) =>
        error instanceof ErrorClima && error.message.includes("et0_fao_evapotranspiration"),
    );
  });

  it("relaya el motivo cuando la API responde con error", async () => {
    respuesta = {
      estado: 400,
      cuerpo: JSON.stringify({ reason: "Latitude must be in range of -90 to 90" }),
    };
    await assert.rejects(
      () => consultarClima(-34.6, -68.3, ayer, hoy),
      (error: Error) => error instanceof ErrorClima && error.message.includes("Latitude must be"),
    );
  });

  it("avisa si la respuesta no es JSON", async () => {
    respuesta = { estado: 200, cuerpo: "<html>502 Bad Gateway</html>" };
    await assert.rejects(
      () => consultarClima(-34.6, -68.3, ayer, hoy),
      (error: Error) => error instanceof ErrorClima && error.message.includes("no es JSON"),
    );
  });

  it("no sale a la red si la parcela no tiene coordenadas", async () => {
    await assert.rejects(
      () => consultarClima(Number.NaN, -68.3, ayer, hoy),
      (error: Error) => error instanceof ErrorClima && error.message.includes("coordenadas"),
    );
  });

  it("devuelve vacío sin consultar si el rango está al revés", async () => {
    respuesta = { estado: 500, cuerpo: "no debería llegar acá" };
    assert.deepEqual(await consultarClima(-34.6, -68.3, hoy, ayer), []);
  });
});

describe("buscarLocalidad", () => {
  it("interpreta los resultados del geocodificador", async () => {
    respuesta = {
      estado: 200,
      cuerpo: JSON.stringify({
        results: [
          { name: "San Rafael", admin1: "Mendoza", country: "Argentina", latitude: -34.6177, longitude: -68.3301 },
        ],
      }),
    };
    const localidades = await buscarLocalidad("San Rafael");
    assert.equal(localidades.length, 1);
    assert.equal(localidades[0]?.nombre, "San Rafael");
    assert.equal(localidades[0]?.latitud, -34.6177);
  });

  it("descarta resultados sin coordenadas usables", async () => {
    respuesta = {
      estado: 200,
      cuerpo: JSON.stringify({ results: [{ name: "Sin coordenadas" }] }),
    };
    assert.deepEqual(await buscarLocalidad("lo que sea"), []);
  });

  it("devuelve vacío cuando no hay resultados, sin romper", async () => {
    respuesta = { estado: 200, cuerpo: JSON.stringify({ generationtime_ms: 0.2 }) };
    assert.deepEqual(await buscarLocalidad("xyzzy"), []);
  });

  it("no consulta con menos de dos letras", async () => {
    respuesta = { estado: 500, cuerpo: "no debería llegar acá" };
    assert.deepEqual(await buscarLocalidad("a"), []);
  });
});
