import { defineConfig } from 'astro/config';

export default defineConfig({
  /* El dominio verdadero, y no es un detalle de prolijidad: de acá salen las
     direcciones absolutas de las vistas previas (og:url, og:image). Con el
     dominio equivocado el sitio se ve perfecto desde adentro y TODAS las
     vistas previas de WhatsApp quedan rotas, apuntando a un host que no
     existe. Estaba en `memorias-adv.pages.dev`; el sitio vive en
     `memorias.pages.dev`. Si algún día cambia —un dominio propio—, se cambia
     acá y el sitio entero lo sigue. */
  site: 'https://memorias.pages.dev',
  build: { format: 'directory' }
});
