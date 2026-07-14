# Atlas Soluciones Tecnológicas — Sitio web

Landing page estática de Atlas, lista para deployar en GitHub Pages, Vercel, Netlify o cualquier hosting. Sin build, sin dependencias: `index.html` + `assets/logo.png`.

## Origen: fusión de dos versiones

Este sitio es la fusión de dos borradores previos. Se eligió lo mejor de cada uno:

### Base: versión HTML (`atlaslanding.html`)
Se usó como esqueleto porque es autocontenida (deployable sin build), tiene SEO completo (title, meta description, `lang="es"`) y el copy comercial más trabajado:

- Tema visual de "plano técnico" con láminas numeradas.
- Sección de diagnóstico (dolores del cliente).
- 6 servicios con precio y CTA de WhatsApp pre-cargado por servicio.
- Sección "Quién está detrás de Atlas" (genera confianza).
- FAQ orientada a conversión y botón flotante de WhatsApp real.
- Accesibilidad: `aria-expanded`, `focus-visible`, `prefers-reduced-motion`.

### Incorporado de la versión React (`atlaslanding.jsx`)
- **El logo real de Atlas** (extraído del base64 embebido → `assets/logo.png`), en nav, footer y favicon.
- **Diagrama de stack** en el hero (Interfaz → Lógica → Datos → Infraestructura), el elemento visual firma de la marca.
- **Sección "Por qué Atlas"** con las 4 razones (interlocutor único, stack mantenible, foco PyME/ONG, seguridad desde el diseño).
- **Proceso de 5 pasos** (suma "Soporte post-lanzamiento" al método).
- FAQ extra: "¿Qué pasa si el proyecto cambia sobre la marcha?".
- Plan Protegido: "Informe mensual de estado".

### Descartado y por qué
- El formulario de contacto del JSX: no enviaba a ningún lado (solo simulaba el envío). Se mantienen WhatsApp y email, que funcionan de verdad en un sitio estático.
- Los precios del JSX donde diferían (institucional 550, tienda 950): se conservaron los de la versión HTML (650 / 1.200), que era la iteración más pulida. Ajustar en `index.html` si se prefiere otra cosa.
- React/Tailwind/lucide como dependencias: innecesarias para una landing; el HTML plano carga más rápido y se hostea gratis en cualquier lado.

## Pendientes antes de publicar

- [ ] Reemplazar `5490000000000` por el número real de WhatsApp (aparece en varios links `wa.me`).
- [ ] Confirmar el dominio (`atlastech.com.ar`) y el email de contacto.
- [ ] Poner la foto profesional en la sección "Responsable de obra".

## Deploy en GitHub Pages

Settings → Pages → Source: rama `main`, carpeta `/ (root)`.
