# Atlas Soluciones Tecnológicas — Sitio web

Landing page de Atlas construida con el stack habitual: **Next.js (App Router) + TypeScript + Tailwind CSS + lucide-react**, con exportación estática (`output: "export"`) — el build genera `out/` y se puede hostear en Vercel, GitHub Pages, Netlify o cualquier hosting estático.

## Desarrollo

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # genera la exportación estática en out/
```

## Estructura

- `app/` — layout (SEO, fuentes vía `next/font`) y página principal.
- `components/` — una sección por componente: `Nav`, `Hero` (con el diagrama de stack), `Diagnostico`, `WhyAtlas`, `Services`, `Projects`, `About`, `Process`, `Maintenance`, `Faq` (client component), `Contact`, `Footer`, `WhatsAppFloat`.
- `lib/site.ts` — dominio, email y número de WhatsApp en un solo lugar.
- `public/logo.png` — logo real de Atlas (extraído del draft React).

## Origen: fusión de dos borradores

El contenido es la fusión de dos versiones previas (`atlaslanding.html` y `atlaslanding.jsx`):

- **De la versión HTML** (base del copy y el diseño): tema "plano técnico" con láminas numeradas, diagnóstico de dolores del cliente, 6 servicios con CTA de WhatsApp pre-cargado por servicio, sección "Quién está detrás de Atlas", FAQ orientada a conversión, accesibilidad (`aria-expanded`, `prefers-reduced-motion`).
- **De la versión React**: el logo real, el diagrama de stack del hero, la sección "Por qué Atlas", el proceso de 5 pasos, la FAQ sobre cambios de alcance y el informe mensual del plan Protegido.
- **Descartado**: el formulario de contacto del JSX (no enviaba a ningún lado — quedan WhatsApp y email, que funcionan en un sitio estático). Donde los precios diferían se conservaron los de la versión HTML (institucional 650, tienda 1.200).

## Pendientes antes de publicar

- [ ] Reemplazar el número de WhatsApp en `lib/site.ts` (`5490000000000`).
- [ ] Confirmar dominio y email en `lib/site.ts`.
- [ ] Poner la foto profesional en la sección "Responsable de obra" (`components/About.tsx`).
