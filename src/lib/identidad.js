/* Cómo se nombra cada cosa del archivo, de una sola manera.
   ==========================================================================
   Una memoria, una persona, un lugar y un acontecimiento tienen cada uno una
   dirección pública, y esa dirección es a la vez tres cosas: el enlace que
   alguien manda por WhatsApp, la `og:url` de la vista previa, y —el día que
   este archivo se publique como datos enlazados— el identificador de esa
   entidad para cualquiera de afuera.

   Que sean la misma es la decisión, y por eso vive en un archivo con tests:

   **El identificador sale del slug, no del título.** El título se corrige
   —una fecha mal leída, un apellido mal escrito— y eso pasa seguido. Si el
   identificador saliera del título, corregir una letra rompería los enlaces
   que alguien ya mandó y, además, convertiría a la persona corregida en otra
   persona distinta para quien leyera los datos desde afuera.

   **Y no sale del orden ni del id interno.** El orden cambia con cada carga y
   el `uuid` de Supabase no significa nada para nadie: dos razones distintas
   para lo mismo, que un identificador tiene que poder leerse y durar.

   ---
   Sobre RiC (Records in Contexts, la norma de descripción archivística del
   Consejo Internacional de Archivos): este archivo NO implementa RiC hoy —ver
   `claude/ric-records-in-contexts.md` para por qué—, pero la clase de cada
   entidad se anota acá al lado de su ruta. Es lo único que RiC pide por
   adelantado y que después no se puede conseguir: un identificador estable
   por entidad, y saber qué es cada una. Lo demás se puede derivar cuando haga
   falta; esto no, porque los enlaces ya están repartidos por el pueblo. */

export const CLASES = {
  /* nuestro nombre     ruta pública        qué es en RiC-O 1.1              */
  memoria:          { ruta: 'memorias',         ric: 'rico:Record' },
  persona:          { ruta: 'personas',         ric: 'rico:Person' },
  lugar:            { ruta: 'lugares',          ric: 'rico:Place' },
  acontecimiento:   { ruta: 'acontecimientos',  ric: 'rico:Event' },
  anio:             { ruta: 'anios',            ric: 'rico:Date' },
  /* La familia es un agente en RiC, no una etiqueta: «los Jutkowski» pueden
     aportar una memoria o aparecer en una. Todavía no tiene página propia. */
  familia:          { ruta: 'familias',         ric: 'rico:Family' },
};

/* El archivo que lleva la memoria —el escaneo— no es la memoria: es su
   encarnación. Una misma fotografía puede estar escaneada dos veces y seguir
   siendo UNA memoria. No tiene dirección propia en el sitio, así que su
   identificador cuelga del de la memoria. */
export const CLASE_ARCHIVO = 'rico:Instantiation';

const limpio = s => String(s == null ? '' : s).trim();

/** ¿Este slug sirve como identificador permanente? */
export function sirveDeIdentificador(slug) {
  const s = limpio(slug);
  /* Minúsculas, números y guiones. Sin tildes ni eñes y sin barras: lo que
     sobreviva igual a una dirección escrita a mano, a un correo que la parte
     en dos renglones y a un teclado de teléfono. */
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

/** La ruta pública: '/memorias/doc-001/'. Con barra final, como el sitio. */
export function ruta(tipo, slug) {
  const clase = CLASES[tipo];
  if (!clase) throw new Error(`no sé qué es un «${tipo}»`);
  const s = limpio(slug);
  if (!s) throw new Error(`una ${tipo} sin slug no se puede nombrar`);
  return `/${clase.ruta}/${s}/`;
}

/** El identificador completo, con el dominio. Es también la `og:url`. */
export function identificador(tipo, slug, base) {
  const b = limpio(base).replace(/\/+$/, '');
  return `${b}${ruta(tipo, slug)}`;
}

/** El de un archivo concreto de una memoria: cuelga del de la memoria. */
export function identificadorDeArchivo(slugMemoria, orden, base) {
  const n = Number(orden);
  if (!Number.isInteger(n) || n < 0) throw new Error('el orden de un archivo es un entero desde 0');
  return `${identificador('memoria', slugMemoria, base)}#archivo-${n}`;
}

/** Qué es esto para RiC. Devuelve null si no lo sabemos, nunca una suposición. */
export function claseRiC(tipo) {
  return CLASES[tipo]?.ric || null;
}
