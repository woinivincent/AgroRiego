export const SITE = {
  domain: "atlastech.com.ar",
  email: "contacto@atlastech.com.ar",
  whatsapp: "5490000000000", // TODO: reemplazar por el número real
};

export function waLink(text: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}

export const WA_GENERIC = waLink(
  "Hola Atlas, quiero hacer una consulta por un proyecto"
);
