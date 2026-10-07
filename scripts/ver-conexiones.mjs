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

/* ---- las curvas que sí se dibujan ---- */
const curvas = red.enlaces.filter(e => e.tipo === 'coaparicion');
console.log(`Curvas entre familias: ${curvas.length}`);
for (const c of curvas.sort((a, b) => b.docs.length - a.docs.length)) {
  console.log(`  ${apellido(c.source)} ↔ ${apellido(c.target)}`
    + `  (${nombre(c.source)} / ${nombre(c.target)})`);
  console.log(`      ${c.docs.length} ${c.docs.length === 1 ? 'memoria' : 'memorias'}: ${c.docs.join(', ')}`);
}
if (!curvas.length) console.log('  (ninguna)');

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
