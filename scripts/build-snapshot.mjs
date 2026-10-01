import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFecha } from './fechas.mjs';
import { parseLinajes } from './linajes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = process.argv.includes('--demo');
const DATA = DEMO ? join(root, 'data', 'demo') : join(root, 'data');
const OUT = join(root, 'src', 'data');
const avisos = [];

/* La fuente puede ser la base o las planillas. Lo que cambia es SÓLO el
   lector: todo lo que sigue recibe las mismas filas. */
const SB = !DEMO && (process.argv.includes('--supabase') || !!process.env.SUPABASE_URL);
/* --con-demo trae también las filas es_demo de la base. Sirve para probar el
   camino entero antes de que haya material real, y arrastra la cinta de aviso:
   si hay una sola fila inventada, el sitio tiene que decirlo. */
const CON_DEMO = process.argv.includes('--con-demo');
/* --sin-aprobar trae también lo que está pendiente de moderación. Es para
   trabajar localmente con material real antes de decidir publicarlo, y por eso
   sólo existe como bandera explícita: nunca se enciende desde una variable de
   entorno, para que no se cuele en un deploy sin que nadie lo haya tecleado.
   Lo que sale a pantalla con esta bandera lleva su propio aviso. */
const SIN_APROBAR = process.argv.includes('--sin-aprobar');
let desdeSB = null, conteoDemo = 0, conteoPendientes = 0;
if (SB) {
  const { traerTablas } = await import('./leer-supabase.mjs');
  const r = await traerTablas({ incluirDemo: CON_DEMO, incluirPendientes: SIN_APROBAR });
  desdeSB = r.tablas;
  conteoDemo = r.conteo.demo;
  conteoPendientes = SIN_APROBAR ? r.conteo.pendientes : 0;
  if (conteoPendientes)
    avisos.push(`VISTA LOCAL: incluye ${conteoPendientes} memoria(s) sin aprobar. No publicar este build.`);
  avisos.push(...r.avisos);
  console.log('   Fuente: Supabase · ' + Object.entries(r.conteo)
    .map(([k, v]) => `${k} ${v}`).join(' · '));
  if (existsSync(join(DATA, 'linajes.txt')))
    console.log('   (data/linajes.txt ignorado: el parentesco viene de la base)');
}

/* ---------- CSV ---------- */
function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  text = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}

function tabla(nombre) {
  if (desdeSB) return (desdeSB[nombre] || []).map((o, i) => ({ ...o, __fila: i + 2 }));
  const p = join(DATA, nombre + '.csv');
  if (!existsSync(p)) { avisos.push(`Falta data/${nombre}.csv`); return []; }
  const rows = parseCSV(readFileSync(p, 'utf8'));
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim());
  return rows.slice(1).map((r, i) => {
    const o = Object.fromEntries(head.map((h, j) => [h, (r[j] ?? '').trim()]));
    o.__fila = i + 2;
    return o;
  });
}

/* El parser vive en fechas.mjs y está cubierto por scripts/test-fechas.mjs.
   Acá solo se recogen sus avisos. */
function fechaDe(raw) {
  const { aviso, ...f } = parseFecha(raw);
  if (aviso) avisos.push(aviso);
  return f;
}

const lista = v => (v || '').split(';').map(s => s.trim()).filter(Boolean);
const esSi = v => /^(si|sí|x|true|1)$/i.test((v || '').trim());
const publicado = r => (r.estado || 'publicado').toLowerCase() === 'publicado';

/* ---------- Carga ---------- */
const lugares = tabla('lugares').map(r => {
  const [d, h] = (r.vigencia || '').split('-').map(s => s.trim());
  return {
    slug: r.slug, nombre: r.nombre, tipo: r.tipo || null,
    // x,y normalizados (0-1) sobre el viewBox del mapa ilustrado; lat/lng quedan
    // libres por si alguna vez hace falta un mapa geográfico de verdad.
    x: r.x ? +r.x : null, y: r.y ? +r.y : null,
    lat: r.lat ? +r.lat : null, lng: r.lng ? +r.lng : null,
    desde: d ? +d : null, hasta: h ? +h : null,
    alias: lista(r.alias), notas: r.notas || '',
    documentos: [], acontecimientos: []
  };
});

const personas = tabla('personas').map(r => {
  const vive = esSi(r.vive);
  const nac = fechaDe(r.nacimiento);
  const def = fechaDe(r.defuncion);
  if (vive && nac.desde) avisos.push(`PRIVACIDAD: ${r.slug} figura como viva y tiene fecha de nacimiento; se oculta en el sitio.`);
  return {
    slug: r.slug, nombre: r.nombre, apellido: r.apellido, apodo: r.apodo || null,
    sexo: r.sexo || null, vive,
    nacimiento: vive ? { desde: null, hasta: null, precision: 'oculta', texto: '' } : nac,
    defuncion: vive ? { desde: null, hasta: null, precision: 'oculta', texto: '' } : def,
    lugar_origen: r.lugar_origen || null, notas: vive ? '' : (r.notas || ''),
    padres: [], hijos: [], conyuges: [], documentos: []
  };
});

/* --- linajes: texto libre del admin -> personas y parentescos ---------------
   Puede dar de alta personas que no están en personas.csv. La planilla manda
   sobre los datos de una persona; el texto manda sobre quién es pariente de quién. */
/* linajes.txt es una entrada del camino de planillas. Cuando la fuente es la
   base, el parentesco vive en nucleos_familiares y nucleo_hijos, y mezclar los
   dos orígenes hace que aparezcan personas que nadie curó —sin cinta de aviso,
   porque el build se considera real—. Una fuente a la vez. */
const linajes = !SB && existsSync(join(DATA, 'linajes.txt'))
  ? parseLinajes(readFileSync(join(DATA, 'linajes.txt'), 'utf8'))
  : { personas: [], uniones: [], filiaciones: [], avisos: [] };
avisos.push(...linajes.avisos);

const vacia = () => ({ desde: null, hasta: null, ref: null, precision: 'desconocida', texto: '' });
for (const l of linajes.personas) {
  if (personas.some(p => p.slug === l.slug)) continue;
  personas.push({
    slug: l.slug, nombre: l.nombre, apellido: l.apellido, apodo: null,
    sexo: null, vive: false, nacimiento: vacia(), defuncion: vacia(),
    lugar_origen: null, notas: '', soloLinaje: true,
    padres: [], hijos: [], conyuges: [], documentos: []
  });
}

const acontecimientos = tabla('acontecimientos').map(r => ({
  slug: r.slug, titulo: r.titulo, tipo: r.tipo || null,
  fecha: fechaDe(r.fecha), descripcion: r.descripcion || '',
  lugares: lista(r.lugares), documentos: []
}));

const documentos = tabla('documentos').filter(publicado).map(r => ({
  slug: r.slug, tipo: r.tipo, titulo: r.titulo || '(sin título)',
  fecha: fechaDe(r.fecha), descripcion: r.descripcion || '',
  transcripcion: r.transcripcion || '',
  personas: lista(r.personas), lugares: lista(r.lugares),
  acontecimientos: lista(r.acontecimientos),
  aportante: r.aportante || null, fuente_url: r.fuente_url || null,
  archivo: r.archivo || null, licencia: r.licencia || 'cesion_vecino',
  /* Una memoria puede tener varias fotos: el Gran Premio del 49 tiene tres.
     `archivo` es la portada —la que va en listados y mapa— y `archivos` el
     rollo completo, en orden. */
  archivos: (r.archivos || r.archivo || '').split(';').map(x => x.trim()).filter(Boolean)
}));

/* ---------- Grafo familiar (planilla plana -> relaciones) ---------- */
const byP = Object.fromEntries(personas.map(p => [p.slug, p]));
for (const r of tabla('familia')) {
  const hijo = byP[r.persona];
  if (!hijo) { avisos.push(`familia.csv fila ${r.__fila}: persona "${r.persona}" no existe`); continue; }
  for (const key of ['padre', 'madre']) {
    const s = (r[key] || '').trim(); if (!s) continue;
    if (!byP[s]) { avisos.push(`familia.csv fila ${r.__fila}: ${key} "${s}" no existe`); continue; }
    if (!hijo.padres.includes(s)) hijo.padres.push(s);
    if (!byP[s].hijos.includes(hijo.slug)) byP[s].hijos.push(hijo.slug);
  }
  for (const s of lista(r.conyuges)) {
    if (!byP[s]) { avisos.push(`familia.csv fila ${r.__fila}: conyuge "${s}" no existe`); continue; }
    if (!hijo.conyuges.includes(s)) hijo.conyuges.push(s);
    if (!byP[s].conyuges.includes(hijo.slug)) byP[s].conyuges.push(hijo.slug);
  }
}

/* --- aristas que aportan los linajes --- */
const unir = (a, b, campo) => {
  if (!byP[a] || !byP[b]) return;
  if (!byP[a][campo].includes(b)) byP[a][campo].push(b);
};
for (const u of linajes.uniones) { unir(u.a, u.b, 'conyuges'); unir(u.b, u.a, 'conyuges'); }
for (const f of linajes.filiaciones)
  for (const padre of f.padres) { unir(f.hijo, padre, 'padres'); unir(padre, f.hijo, 'hijos'); }

/* ---------- Familias: la unidad conyugal con sus hijos agrupados -----------
   Guardar sólo aristas padre–hijo pierde QUÉ hijos son de QUÉ unión. Sin ese
   dato no se puede dibujar bien a alguien que se casó dos veces, que en un
   pueblo del siglo XX es cualquiera que enviudó joven. */
const familias = new Map();
const nuevaFamilia = padres => {
  const k = padres.filter(s => s && byP[s]).slice().sort().join('|');
  if (!k) return null;
  if (!familias.has(k))
    familias.set(k, { id: 'fam-' + (familias.size + 1), conyuges: k.split('|'), hijos: [] });
  return familias.get(k);
};
const sumarHijo = (fam, hijo) => {
  if (fam && byP[hijo] && !fam.hijos.includes(hijo)) fam.hijos.push(hijo);
};

for (const u of linajes.uniones) nuevaFamilia([u.a, u.b]);
for (const f of linajes.filiaciones) sumarHijo(nuevaFamilia(f.padres), f.hijo);
for (const r of tabla('familia')) {
  const padres = [r.padre, r.madre].filter(Boolean);
  if (padres.length) sumarHijo(nuevaFamilia(padres), r.persona);
  for (const c of lista(r.conyuges)) nuevaFamilia([r.persona, c]);
}
/* hijos cuyos padres están en personas.csv pero sin fila de familia */
for (const p of personas) {
  if (p.padres.length && ![...familias.values()].some(f => f.hijos.includes(p.slug)))
    sumarHijo(nuevaFamilia(p.padres), p.slug);
}
const listaFamilias = [...familias.values()]
  .filter(f => f.conyuges.length || f.hijos.length);

/* ---------- Enlaces inversos ---------- */
const byL = Object.fromEntries(lugares.map(l => [l.slug, l]));
const byA = Object.fromEntries(acontecimientos.map(a => [a.slug, a]));
const enlazar = (slugs, indice, destino, origen, campo) => {
  for (const s of slugs) {
    const t = indice[s];
    if (!t) { avisos.push(`${origen} "${destino}" apunta a ${campo} inexistente: "${s}"`); continue; }
    t.documentos.push(destino);
  }
};
for (const d of documentos) {
  enlazar(d.personas, byP, d.slug, 'documento', 'persona');
  enlazar(d.lugares, byL, d.slug, 'documento', 'lugar');
  enlazar(d.acontecimientos, byA, d.slug, 'documento', 'acontecimiento');
}
for (const a of acontecimientos)
  for (const s of a.lugares)
    if (byL[s]) byL[s].acontecimientos.push(a.slug);
    else avisos.push(`acontecimiento "${a.slug}" apunta a lugar inexistente: "${s}"`);

/* ---------- Años ---------- */
const anios = {};
const bucket = (anio, tipo, slug) => {
  if (anio == null) return;
  (anios[anio] ||= { anio, documentos: [], acontecimientos: [] })[tipo].push(slug);
};
for (const d of documentos) bucket(d.fecha.ref, 'documentos', d.slug);
for (const a of acontecimientos) bucket(a.fecha.ref, 'acontecimientos', a.slug);

const sinFecha = documentos.filter(d => d.fecha.ref == null).length;
if (sinFecha) avisos.push(`${sinFecha} documento(s) publicados sin fecha reconocible.`);

/* ---------- Salida ---------- */
const snapshot = {
  generado: new Date().toISOString(),
  demo: DEMO || (SB && CON_DEMO && conteoDemo > 0),
  sinAprobar: conteoPendientes,
  totales: {
    personas: personas.length, lugares: lugares.length,
    sinConectar: personas.filter(p => !p.padres.length && !p.hijos.length && !p.conyuges.length).length,
    acontecimientos: acontecimientos.length, documentos: documentos.length,
    familias: listaFamilias.length
  },
  personas, lugares, acontecimientos, documentos,
  familias: listaFamilias,
  anios: Object.values(anios).sort((a, b) => a.anio - b.anio),
  avisos
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf8');

const kb = (JSON.stringify(snapshot).length / 1024).toFixed(1);
console.log(`snapshot.json  ${kb} KB${DEMO ? '  [DEMO]' : ''}`);
console.log(`  personas ${personas.length} · lugares ${lugares.length} · acontecimientos ${acontecimientos.length} · documentos ${documentos.length}`);
if (avisos.length) {
  console.log(`\n  ${avisos.length} aviso(s):`);
  for (const a of avisos) console.log('   - ' + a);
}
