/* Qué conexiones está dibujando el archivo, y por qué.
   -------------------------------------------------------------------------
   Existe porque mirar la pantalla y no ver una curva no dice nada: puede ser
   que la regla la haya descartado con razón —mismo apellido, parientes
   directos— o puede ser que algo esté roto. Las dos cosas se ven igual.

   Esto lee el snapshot ya construido y dice, memoria por memoria, qué pares
   produjeron una curva y qué pares no, con el motivo. Es la Regla 3 aplicada
   a las conexiones: el sistema sabe qué le falta y también por qué.

   Se corre después de un build:  node scripts/ver-conexiones.mjs           */
import { readFileSync } from 'node:fs';
import { armarRed } from '../src/lib/red.js';

const snap = JSON.parse(readFileSync(new URL('../src/data/snapshot.json', import.meta.url)));
const { personas, documentos, familias = [], lugares = [], acontecimientos = [] } = snap;
const red = armarRed(personas, documentos, familias, lugares, acontecimientos);

const P = Object.fromEntries(personas.map(p => [p.slug, p]));
const nombre = s => P[s] ? [P[s].nombre, P[s].apellido].filter(Boolean).join(' ') : s;
const apellido = s => P[s]?.apellido || '(sin apellido)';

console.log(`Snapshot del ${snap.generado?.slice(0, 16) || '?'}`
  + (snap.demo ? '  · CON datos de demostración' : '')
  + (snap.sinAprobar ? '  · incluye pendientes' : ''));
console.log(`${documentos.length} memorias · ${personas.length} personas · ${lugares.length} lugares\n`);

/* ---- las memorias, que ahora son nodos ---- */
const mems = red.nodos.filter(n => n.tipo === 'memoria');
const apareceEn = {};
for (const e of red.enlaces.filter(e => e.tipo === 'aparece'))
  (apareceEn[e.target] ||= []).push(e.source);
const ocurreEn = {};
for (const e of red.enlaces.filter(e => e.tipo === 'ocurre'))
  (ocurreEn[e.source] ||= []).push(e.target);
const comoSeLlama = id => red.nodos.find(n => n.id === id)?.nombre || id;

console.log(`Memorias en la red: ${mems.length} de ${documentos.length}`);
for (const m of mems.sort((a, b) => (apareceEn[b.id] || []).length - (apareceEn[a.id] || []).length)) {
  const quienes = (apareceEn[m.id] || []).map(nombre);
  console.log(`  ${m.nombre}${m.anio ? '  (' + m.anio + ')' : ''}`);
  console.log(`      aparecen: ${quienes.join(', ')}`);
  const donde = (ocurreEn[m.id] || []).map(comoSeLlama);
  if (donde.length) console.log(`      ocurre en: ${donde.join(' · ')}`);
}
if (!mems.length) console.log('  (ninguna: ninguna memoria nombra a alguien del archivo)');

/* ---- a cuántas memorias está cada persona de las demás ----
   Es la afirmación romántica del proyecto, hecha cuenta: "en Aristóbulo, de
   algún modo, todos compartimos alguna memoria". Se mide recorriendo el grafo
   bipartito — persona, memoria, persona — y contando saltos. */
const vecinaDe = {};
for (const e of red.enlaces.filter(e => e.tipo === 'aparece')) {
  for (const otro of apareceEn[e.target]) if (otro !== e.source)
    (vecinaDe[e.source] ||= new Set()).add(otro);
}
const gentePorId = red.nodos.filter(n => n.tipo === 'persona').map(n => n.id);
const alcance = origen => {
  const visto = new Set([origen]);
  let frente = [origen], saltos = 0;
  while (frente.length) {
    saltos++;
    const sig = [];
    for (const x of frente)
      for (const v of vecinaDe[x] || []) if (!visto.has(v)) { visto.add(v); sig.push(v); }
    frente = sig;
  }
  return { alcanzadas: visto.size - 1, saltos: saltos - 1 };
};
if (gentePorId.length) {
  const islas = gentePorId.map(id => alcance(id).alcanzadas);
  const mayor = Math.max(...islas);
  const solas = islas.filter(n => n === 0).length;
  console.log(`\nTodos compartimos alguna memoria:`);
  console.log(`  el grupo más grande alcanza a ${mayor} de ${gentePorId.length - 1} personas`);
  console.log(`  ${solas} persona(s) no comparten memoria con nadie`);
}

console.log('');
/* ---- las curvas entre personas, que ya no se dibujan ---- */
/* ---- y por qué las otras no ----
   Se repite la misma cuenta que hace red.js, pero anotando el motivo. Si
   alguna vez las dos no coinciden, es que una de las dos está mal. */
const clave = (a, b) => [a, b].sort().join('\u0000');
const directo = new Set();
for (const s of Object.keys(P))
  for (const v of [...(P[s].padres || []), ...(P[s].hijos || []), ...(P[s].conyuges || [])])
    if (P[v]) directo.add(clave(s, v));

const motivos = new Map();
const sumar = (m, det) => motivos.set(m, [...(motivos.get(m) || []), det]);

for (const d of documentos) {
  const nombrada = d.personas || [];
  const visible = nombrada.filter(s => P[s]);
  for (const s of nombrada)
    if (!P[s]) sumar('la persona no está en el archivo', `${d.slug}: ${s}`);
  for (let i = 0; i < visible.length; i++)
    for (let j = i + 1; j < visible.length; j++) {
      const [a, b] = [visible[i], visible[j]];
      const apA = P[a].apellido || '', apB = P[b].apellido || '';
      if (apA && apB && apA === apB)
        sumar('mismo apellido: no es un cruce entre familias', `${d.slug}: ${nombre(a)} / ${nombre(b)}`);
      else if (directo.has(clave(a, b)))
        sumar('parientes directos: ya lo dibuja la genealogía', `${d.slug}: ${nombre(a)} / ${nombre(b)}`);
    }
  if (visible.length < 2)
    sumar('la memoria nombra menos de dos personas', `${d.slug}: ${visible.length}`);
}

console.log('\nPares que no dibujan curva, y por qué:');
if (!motivos.size) console.log('  (ninguno)');
for (const [m, casos] of motivos) {
  console.log(`  ${m} — ${casos.length}`);
  for (const c of casos.slice(0, 12)) console.log(`      ${c}`);
  if (casos.length > 12) console.log(`      …y ${casos.length - 12} más`);
}

if (snap.avisos?.length) {
  console.log('\nLo que el build avisó:');
  for (const a of snap.avisos) console.log('  · ' + a);
}
