/**
 * Comprueba contra la API real de Open-Meteo que el cliente de clima funciona:
 * que el servicio responde, que devuelve la evapotranspiración que esperamos y
 * que los valores son plausibles.
 *
 *   npm run clima:probar                 # San Rafael, Mendoza
 *   npm run clima:probar -- -31.4 -64.2  # otras coordenadas
 *
 * Los tests de `npm test` usan un servidor local que imita a Open-Meteo: sirven
 * para saber que interpretamos bien la respuesta, no para saber que la API sigue
 * devolviendo lo mismo. Eso lo comprueba este script, y necesita salida a internet.
 */
import { buscarLocalidad, consultarClima, ErrorClima } from "../src/lib/clima";

const LATITUD = Number(process.argv[2] ?? -34.6177);
const LONGITUD = Number(process.argv[3] ?? -68.3301);

// Rango en el que puede caer una ETo diaria real: fuera de acá algo anda mal
const ETO_MINIMA_MM = 0;
const ETO_MAXIMA_MM = 20;

function fallar(mensaje: string): never {
  console.error(`\n❌ ${mensaje}`);
  process.exit(1);
}

async function main() {
  console.log(`Consultando Open-Meteo para ${LATITUD}, ${LONGITUD}…\n`);

  const desde = new Date();
  desde.setDate(desde.getDate() - 7);
  const hasta = new Date();

  let dias;
  try {
    dias = await consultarClima(LATITUD, LONGITUD, desde, hasta);
  } catch (error) {
    if (error instanceof ErrorClima) fallar(error.message);
    throw error;
  }

  if (dias.length === 0) fallar("La API respondió, pero no devolvió ningún día con datos.");

  console.log("fecha        ETo (mm)   lluvia (mm)");
  for (const dia of dias) {
    console.log(
      `${dia.fecha}   ${dia.etoMm.toFixed(2).padStart(7)}   ${dia.lluviaMm.toFixed(1).padStart(10)}`,
    );
  }

  const fueraDeRango = dias.filter(
    (dia) => dia.etoMm < ETO_MINIMA_MM || dia.etoMm > ETO_MAXIMA_MM,
  );
  if (fueraDeRango.length > 0) {
    fallar(
      `Hay ETo fuera del rango plausible (${ETO_MINIMA_MM}-${ETO_MAXIMA_MM} mm/día): ` +
        fueraDeRango.map((dia) => `${dia.fecha} = ${dia.etoMm}`).join(", "),
    );
  }

  const promedio = dias.reduce((total, dia) => total + dia.etoMm, 0) / dias.length;
  console.log(
    `\n✓ ${dias.length} día(s) con evapotranspiración, promedio ${promedio.toFixed(2)} mm/día`,
  );

  console.log("\nProbando la búsqueda de localidades…");
  const localidades = await buscarLocalidad("San Rafael");
  if (localidades.length === 0) fallar("El geocodificador no devolvió ninguna localidad.");
  for (const localidad of localidades.slice(0, 3)) {
    console.log(
      `  ${[localidad.nombre, localidad.region, localidad.pais].filter(Boolean).join(", ")} → ` +
        `${localidad.latitud}, ${localidad.longitud}`,
    );
  }

  console.log("\n✅ Open-Meteo responde y el cliente interpreta bien los datos.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
