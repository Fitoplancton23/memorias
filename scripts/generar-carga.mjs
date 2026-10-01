/* Genera el SQL de carga a partir de intake/memorias.json y intake/fotos.json.
   -------------------------------------------------------------------------
   Es el puente provisorio hasta que exista el panel de carga. Hace a mano, una
   vez, lo que el panel va a hacer siempre — y por eso sirve también como
   especificación de lo que el panel necesita resolver.

   Todo entra con estado='pendiente' y es_demo=false: material real, sin
   publicar, hasta que alguien lo apruebe.                                   */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFecha } from './fechas.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const datos = JSON.parse(readFileSync(join(root, 'intake', 'memorias.json'), 'utf8'));
const manifiesto = existsSync(join(root, 'intake', 'fotos.json'))
  ? JSON.parse(readFileSync(join(root, 'intake', 'fotos.json'), 'utf8')) : [];
const foto = Object.fromEntries(manifiesto.map(f => [f.nombre, f]));

const q = v => v == null || v === '' ? 'null' : "'" + String(v).replace(/'/g, "''") + "'";
const n = v => v == null || v === '' ? 'null' : Number(v);
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* Partir un nombre en nombre + apellido es una heurística, no una verdad.
   Las dudosas se listan al final para que las revise una persona. */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'da', 'dos', 'van', 'von']);
const dudosas = [];
const TRATAMIENTOS = /^(do[nñ]a?|sra\.?|sr\.?|se[nñ]ora?|profe?|maestra?)$/i;
function partir(completo) {
  /* Convención GEDCOM: el apellido va entre barras. Es la salida para cuando
     la heurística no puede acertar — "/Potschka/" es apellido sin nombre de
     pila conocido, "Juan /de la Cruz/" marca dónde empieza el apellido. Quien
     carga el dato puede ser explícito en vez de pelearse con la regla. */
  const barras = completo.match(/^(.*?)\s*\/([^/]+)\/\s*(.*)$/);
  if (barras) {
    const nombre = (barras[1] + ' ' + barras[3]).replace(/\s+/g, ' ').trim();
    return { nombre: nombre || null, apellido: barras[2].trim(), apodo: null };
  }
  let limpio = completo.replace(/['"]([^'"]+)['"]/g, '').replace(/\s+/g, ' ').trim();
  let apodo = (completo.match(/['"]([^'"]+)['"]/) || [])[1] || null;
  /* "doña Goya" no es nombre "doña" + apellido "Goya": doña es un tratamiento.
     Se saca del nombre, pero se guarda el original como apodo, porque así es
     como la conocen en el pueblo y eso también es un dato. */
  let t = limpio.split(' ');
  if (t.length > 1 && TRATAMIENTOS.test(t[0])) {
    apodo = apodo || completo.trim();
    t = t.slice(1);
    limpio = t.join(' ');
  }
  if (t.length === 1) {
    dudosas.push(`${completo} — una sola palabra: se toma como nombre. Si es apellido, escribirlo /${t[0]}/`);
    return { nombre: t[0], apellido: null, apodo };
  }
  /* Partículas. Hay dos patrones y no se distinguen solos:
       "Juan de la Cruz"         → de la Cruz es el apellido entero
       "Lucy Domínguez de Beitía" → Domínguez es suyo, "de Beitía" es de casada
       "María del Carmen Pérez"   → del Carmen es parte del NOMBRE
     La heurística: si antes de la partícula hay dos o más palabras, la de
     justo antes ya es apellido. Si hay una sola, la partícula abre el
     apellido. El tercer caso no lo resuelve ninguna regla, así que todo
     nombre con partícula queda marcado para que lo mire una persona. */
  let corte = t.length - 1;
  for (let i = t.length - 2; i >= 1; i--) {
    if (!PARTICULAS.has(t[i].toLowerCase())) continue;
    corte = i >= 2 ? i - 1 : i;
    dudosas.push(`${completo} — tiene partícula: confirmar dónde empieza el apellido`);
    break;
  }
  const nombre = t.slice(0, corte).join(' ');
  const apellido = t.slice(corte).join(' ');
  return { nombre, apellido, apodo };
}

/* ---- personas ---- */
const personas = new Map();
for (const m of datos.memorias) for (const p of m.personas || []) {
  if (personas.has(p)) continue;
  const x = partir(p);
  const base = slug(`${x.nombre || ''}-${x.apellido || ''}`);
  let s = base;
  let i = 2; while ([...personas.values()].some(v => v.slug === s)) s = base + '-' + i++;
  personas.set(p, { ...x, slug: s });
}

const L = [];
L.push('-- 09_carga_real.sql — generado por scripts/generar-carga.mjs');
L.push('-- Material REAL del documento del grupo. Entra como pendiente: no se publica.');
L.push('-- Idempotente: se puede volver a correr sin duplicar.');
L.push('');
L.push('begin;');
L.push('');
L.push('-- ---------- lugares ----------');
for (const l of datos.lugares) {
  L.push(`insert into lugares (slug, nombre, lat, lng, notas, es_demo) values (${q(l.slug)}, ${q(l.nombre)}, ${n(l.lat)}, ${n(l.lng)}, ${q(l.notas)}, false)`);
  L.push(`  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;`);
}
L.push('');
L.push('-- ---------- personas ----------');
L.push('-- linaje_id y apellido quedan null a propósito cuando no se saben: que una');
L.push('-- persona esté en el archivo no significa que se sepa su familia ni su');
L.push('-- apellido de documento. Es la Regla 3.');
L.push('-- `estado` se deja en su valor por defecto: lo que se modera es la memoria,');
L.push('-- no la persona.');
for (const [, p] of personas) {
  L.push(`insert into personas (slug, nombre, apellido, apodo, es_demo) values (${q(p.slug)}, ${q(p.nombre)}, ${q(p.apellido)}, ${q(p.apodo)}, false)`);
  L.push(`  on conflict (slug) do nothing;`);
}
L.push('');
L.push('-- ---------- memorias ----------');
for (const m of datos.memorias) {
  const f = parseFecha(m.fecha_texto || '');
  /* `anio_hasta` es un lapso —"la memoria va de 1966 a 1968"—, no la
     incertidumbre de la fecha. El parser devuelve un rango en los dos casos:
     para "1960 aprox" devuelve 1955-1965, que NO es un lapso de cinco años
     sino el margen de error. Sólo se guarda el rango cuando el texto trae un
     lapso explícito; la granularidad real la dice precision_fecha. */
  const lapso = f.precision !== 'dia'
    && /\d{2,4}\s*(?:\/|-|\sa\s)\s*\d{2,4}/.test(m.fecha_texto || '')
    && f.hasta !== f.desde;
  const fotos = (m.fotos || []).map(x => foto[x]).filter(Boolean);
  const portada = fotos[0]?.foto_url || null;
  L.push(`insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)`);
  L.push(`  values (${q(m.slug)}, ${q(m.titulo)}, ${q(m.descripcion)}, ${q(m.fecha_texto)}, ${n(f.ref)}, ${f.precision === 'circa' || f.precision === 'decada'}, ${n(lapso ? f.hasta : null)}, ${q(f.precision)},`);
  L.push(`          ${m.lugar ? `(select id from lugares where slug = ${q(m.lugar)})` : 'null'}, ${q(portada)}, ${q(m.aportante)}, 'pendiente', false)`);
  L.push(`  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,`);
  L.push(`    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,`);
  L.push(`    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;`);
}
L.push('');
L.push('-- ---------- fotos ----------');
for (const m of datos.memorias) {
  const fotos = (m.fotos || []).map(x => foto[x]).filter(Boolean);
  fotos.forEach((f, i) => {
    L.push(`insert into memoria_fotos (memoria_id, url, orden, ancho, alto)`);
    L.push(`  values ((select id from memorias where slug = ${q(m.slug)}), ${q(f.foto_url)}, ${i}, ${n(f.ancho)}, ${n(f.alto)})`);
    L.push(`  on conflict (memoria_id, url) do update set orden = excluded.orden;`);
  });
}
L.push('');
L.push('-- ---------- apariciones ----------');
L.push('-- confianza = probable: los nombres vienen del relato de un vecino, no de');
L.push('-- un documento. Que alguien diga quién está en la foto no es lo mismo que');
L.push('-- verificarlo, y el modelo distingue las dos cosas.');
for (const m of datos.memorias) for (const p of m.personas || []) {
  const x = personas.get(p);
  L.push(`insert into memoria_personas (memoria_id, persona_id, confianza)`);
  L.push(`  values ((select id from memorias where slug = ${q(m.slug)}), (select id from personas where slug = ${q(x.slug)}), 'probable')`);
  L.push(`  on conflict do nothing;`);
}
L.push('');
L.push('commit;');
L.push('');
L.push('select ' + [
  "(select count(*) from lugares where es_demo = false) as lugares",
  "(select count(*) from personas where es_demo = false) as personas",
  "(select count(*) from memorias where es_demo = false) as memorias",
  "(select count(*) from memoria_fotos) as fotos",
  "(select count(*) from memoria_personas mp join memorias m on m.id = mp.memoria_id where m.es_demo = false) as apariciones",
].join(', ') + ';');

writeFileSync(join(root, 'db', '09_carga_real.sql'), L.join('\n') + '\n');

const conFoto = datos.memorias.filter(m => (m.fotos || []).length).length;
console.log(`09_carga_real.sql · ${datos.lugares.length} lugares · ${personas.size} personas · ${datos.memorias.length} memorias`);
console.log(`   ${conFoto} con foto · ${datos.memorias.reduce((a, m) => a + (m.fotos || []).length, 0)} imágenes`);
if (dudosas.length) {
  console.log(`\nNombres a revisar a mano (${dudosas.length}):`);
  for (const d of dudosas) console.log('   ' + d);
}
