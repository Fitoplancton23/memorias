import snapshot from '../data/snapshot.json';
import { otrosNombres } from './buscar.js';
import { comoSeLlama } from './persona-nueva.js';

export const { personas, lugares, acontecimientos, documentos, familias, anios, totales, avisos, generado, demo } = snapshot;
export const fuente = snapshot.fuente || 'csv';
export const sinAprobar = snapshot.sinAprobar || 0;

const indexar = (arr) => Object.fromEntries(arr.map(x => [x.slug, x]));
export const P = indexar(personas);
export const L = indexar(lugares);
export const A = indexar(acontecimientos);
export const D = indexar(documentos);

/* Cómo se la nombra en pantalla. El apodo entra como último recurso y no
   como adorno: a quien en el pueblo es "el Negro" y nada más, el archivo tiene
   que llamarlo el Negro. Antes caía al slug y en pantalla salía "el-negro",
   que es un dato técnico mostrado a una persona. */
export const nombre = (p) => comoSeLlama(p) || p?.slug || '?';
export const fecha = (f) => (f && f.texto) ? f.texto : 's/f';

export function vida(p) {
  const n = p.nacimiento?.texto, m = p.defuncion?.texto;
  if (!n && !m) return '';
  return `${n || '?'} – ${m || (p.vive ? '' : '?')}`.trim();
}

/* Lo que de cada memoria se puede buscar.
   -------------------------------------------------------------------------
   Vive acá, y no en cada página, porque el mapa y la línea de tiempo tienen
   que buscar exactamente lo mismo. Si cada vista armara su propio índice,
   escribir "el Negro" encontraría cuatro memorias en una y tres en la otra, y
   la que buscó no tendría forma de saber cuál de las dos le miente.

   El snapshot guarda referencias —`personas: ['juan-potkova']`—, y nadie busca
   un slug: acá se resuelven a los nombres y apodos que la gente escribe. */
export const memoriasBuscables = documentos.map(d => ({
  slug: d.slug,
  titulo: d.titulo || '',
  /* La transcripción cuenta tanto como la descripción: en una carta o un acta,
     lo que alguien va a recordar está en el texto y no en el título que le
     puso quien la cargó. */
  texto: [d.descripcion, d.transcripcion].filter(Boolean).join(' '),
  gente: (d.personas || []).map(s => P[s]).filter(Boolean)
    .map(p => ({ nombre: nombre(p), otros: otrosNombres(p) })),
  lugares: (d.lugares || []).map(s => L[s]?.nombre).filter(Boolean),
  hechos: (d.acontecimientos || []).map(s => A[s]?.titulo).filter(Boolean),
  anio: d.fecha?.ref ?? null,
  /* Qué marcadores del mapa prender cuando esta memoria calza, y si tiene
     alguno: una memoria sin lugar ubicado no se puede mostrar en el mapa, y el
     mapa tiene que decirlo en vez de dejarla afuera en silencio. */
  sitios: (d.lugares || []).filter(s => L[s]?.lat != null),
}));
