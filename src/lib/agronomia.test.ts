import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aguaUtilTotalMm,
  aplicacionDesdeLamina,
  costoAplicacion,
  deficitAcumuladoMm,
  eficiencia,
  kc,
  laminaDesdeDuracion,
  laminaMaximaMm,
  lluviaEfectivaMm,
} from "./agronomia";

describe("aplicación de agua", () => {
  it("convierte lámina en litros usando 1 mm = 1 L/m² y la eficiencia del método", () => {
    const goteo = aplicacionDesdeLamina({
      laminaNetaMm: 10,
      superficieHa: 1,
      caudalLh: 20000,
      metodoRiego: "Goteo",
    });
    // 10 mm sobre 1 ha son 100.000 L netos; al 90% de eficiencia hacen falta más
    assert.equal(goteo.litros, Math.round(100_000 / 0.9));
    assert.equal(goteo.minutos, Math.round((goteo.litros / 20000) * 60));
  });

  it("exige más agua cuanto menos eficiente es el método", () => {
    const comun = { laminaNetaMm: 10, superficieHa: 1, caudalLh: 20000 };
    const goteo = aplicacionDesdeLamina({ ...comun, metodoRiego: "Goteo" });
    const surco = aplicacionDesdeLamina({ ...comun, metodoRiego: "Surco" });
    assert.ok(surco.litros > goteo.litros);
  });

  it("vuelve a la misma lámina al recorrer el camino inverso", () => {
    const ida = aplicacionDesdeLamina({
      laminaNetaMm: 10,
      superficieHa: 1,
      caudalLh: 20000,
      metodoRiego: "Goteo",
    });
    const vuelta = laminaDesdeDuracion({
      duracionMin: ida.minutos,
      superficieHa: 1,
      caudalLh: 20000,
      metodoRiego: "Goteo",
    });
    assert.ok(Math.abs(vuelta.laminaNetaMm - 10) < 0.05);
  });

  it("no divide por cero cuando la parcela no tiene superficie", () => {
    const sinSuperficie = laminaDesdeDuracion({
      duracionMin: 60,
      superficieHa: 0,
      caudalLh: 20000,
      metodoRiego: "Goteo",
    });
    assert.equal(sinSuperficie.laminaNetaMm, 0);
  });
});

describe("suelo", () => {
  it("calcula el agua útil como agua por metro × profundidad de raíces", () => {
    assert.equal(aguaUtilTotalMm("Franco", 1), 165);
    assert.equal(aguaUtilTotalMm("Franco", 0.5), 82.5);
  });

  it("topea la lámina de reposición en el umbral de agotamiento", () => {
    assert.equal(laminaMaximaMm("Franco", 1, 0.5), 82.5);
  });

  it("usa un valor por defecto para una textura desconocida", () => {
    assert.equal(aguaUtilTotalMm("Volcánico", 1), 120);
  });

  // La relación entre texturas importa más que los números exactos, y es
  // justamente donde es fácil equivocarse.
  it("crece con el contenido de finos desde la arena hasta el franco arcilloso", () => {
    const porMetro = (suelo: string) => aguaUtilTotalMm(suelo, 1);
    assert.ok(porMetro("Arenoso") < porMetro("Franco arenoso"));
    assert.ok(porMetro("Franco arenoso") < porMetro("Franco"));
    assert.ok(porMetro("Franco") < porMetro("Limoso"));
    assert.ok(porMetro("Limoso") < porMetro("Franco arcilloso"));
  });

  it("vuelve a bajar en la arcilla pura: retiene mucha agua, pero no toda es útil", () => {
    // El máximo de agua útil está en el franco arcilloso, no en la arcilla:
    // en la arcilla buena parte del agua queda por debajo del punto de
    // marchitez permanente y la planta no puede extraerla.
    assert.ok(aguaUtilTotalMm("Arcilloso", 1) < aguaUtilTotalMm("Franco arcilloso", 1));
  });
});

describe("eficiencia de aplicación", () => {
  it("usa el valor de diseño del método cuando la parcela no midió el suyo", () => {
    assert.equal(eficiencia("Goteo"), 0.9);
    assert.equal(eficiencia("Goteo", null), 0.9);
  });

  it("prefiere la eficiencia medida de la parcela sobre la tabla", () => {
    // Un sistema de surco real en Cuyo puede estar muy por debajo del 60%
    // de manual: la parcela tiene que poder decir la suya.
    assert.equal(eficiencia("Surco", 0.35), 0.35);
  });

  it("ignora valores imposibles y cae al valor de diseño", () => {
    assert.equal(eficiencia("Goteo", 0), 0.9);
    assert.equal(eficiencia("Goteo", 1.5), 0.9);
    assert.equal(eficiencia("Goteo", -0.5), 0.9);
  });

  it("aplica la eficiencia medida al cálculo de agua y de tiempo", () => {
    const comun = { laminaNetaMm: 10, superficieHa: 1, caudalLh: 20000, metodoRiego: "Surco" };
    const manual = aplicacionDesdeLamina({ ...comun, eficienciaPropia: 0.35 });
    const diseno = aplicacionDesdeLamina(comun);
    // Menos eficiencia real significa más agua y más tiempo de bomba
    assert.ok(manual.litros > diseno.litros);
    assert.equal(manual.litros, Math.round(100_000 / 0.35));
  });
});

describe("lluvia efectiva", () => {
  it("descarta las lluvias que se evaporan antes de infiltrar", () => {
    assert.equal(lluviaEfectivaMm(1), 0);
    assert.equal(lluviaEfectivaMm(2), 0);
  });

  it("descuenta 2 mm y topea el aporte en el 80%", () => {
    assert.equal(lluviaEfectivaMm(10), 8);
    assert.equal(lluviaEfectivaMm(50), 40);
  });
});

describe("déficit acumulado", () => {
  const serie = [
    { etoMm: 6, lluviaMm: 0 },
    { etoMm: 6, lluviaMm: 0 },
    { etoMm: 6, lluviaMm: 10 },
    { etoMm: 6, lluviaMm: 0 },
    { etoMm: 6, lluviaMm: 0 },
  ];

  it("suma ETo por Kc y resta la lluvia efectiva", () => {
    // 5 días × 6 mm × 1,2 = 36 mm, menos 8 mm de lluvia efectiva
    assert.ok(Math.abs(deficitAcumuladoMm(serie, 1.2) - 28) < 1e-9);
  });

  it("nunca queda negativo: la lluvia de más no se acumula a favor", () => {
    assert.equal(deficitAcumuladoMm([{ etoMm: 1, lluviaMm: 100 }], 1), 0);
  });
});

describe("coeficiente de cultivo", () => {
  it("varía con la etapa fenológica", () => {
    assert.equal(kc("Maíz", "MEDIA"), 1.2);
    assert.equal(kc("Maíz", "INICIAL"), 0.3);
  });

  it("cae en los valores genéricos para un cultivo o etapa que no conoce", () => {
    assert.equal(kc("Quinoa", "MEDIA"), 1);
    assert.equal(kc("Maíz", "COSECHA"), 1.2);
  });
});

describe("costo de la aplicación", () => {
  it("suma energía de bombeo y agua", () => {
    const costo = costoAplicacion({
      litros: 100_000,
      minutos: 120,
      potenciaBombaKw: 10,
      precioKwh: 85,
      precioAguaM3: 12,
    });
    assert.ok(Math.abs(costo.energia - 1700) < 1e-9); // 10 kW × 2 h × 85
    assert.ok(Math.abs(costo.agua - 1200) < 1e-9); // 100 m³ × 12
    assert.ok(Math.abs(costo.total - 2900) < 1e-9);
  });

  it("no cobra energía si la parcela no tiene potencia de bomba cargada", () => {
    const costo = costoAplicacion({
      litros: 1000,
      minutos: 60,
      potenciaBombaKw: null,
      precioKwh: 85,
      precioAguaM3: 0,
    });
    assert.equal(costo.total, 0);
  });
});
