import snapshot from '../data/snapshot.json';

export const { personas, lugares, acontecimientos, documentos, familias, anios, totales, avisos, generado, demo } = snapshot;
export const sinAprobar = snapshot.sinAprobar || 0;

const indexar = (arr) => Object.fromEntries(arr.map(x => [x.slug, x]));
export const P = indexar(personas);
export const L = indexar(lugares);
export const A = indexar(acontecimientos);
export const D = indexar(documentos);

export const nombre = (p) => [p?.nombre, p?.apellido].filter(Boolean).join(' ') || p?.slug || '?';
export const fecha = (f) => (f && f.texto) ? f.texto : 's/f';

export function vida(p) {
  const n = p.nacimiento?.texto, m = p.defuncion?.texto;
  if (!n && !m) return '';
  return `${n || '?'} – ${m || (p.vive ? '' : '?')}`.trim();
}
