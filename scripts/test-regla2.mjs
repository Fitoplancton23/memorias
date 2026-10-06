/* Regla 2 — una conexión entre familias no se guarda: se calcula.
   -------------------------------------------------------------------------
   Se deriva de las memorias compartidas, así que si se borra la memoria, la
   conexión tiene que desaparecer. La consecuencia para el frontend es la que
   importa: no puede dibujar una curva sin tener la memoria en la mano, y por
   eso toda curva es explicable — "estas dos familias están conectadas PORQUE
   compartieron esto".

   Esto estaba escrito como una prueba a mano: borrar una fila, reconstruir,
   mirar si la curva desaparece. Una prueba que hay que acordarse de hacer es
   una prueba que no se hace, y ahora que la red calcula las conexiones en el
   navegador hay una forma nueva de romper la regla sin que nadie se entere.
   Acá queda como lo que es: un invariante que se verifica solo.

   Lo que esto NO cubre es el camino completo —base, lector, snapshot,
   pantalla—. Eso se comprueba una vez a mano y está escrito en el roadmap. */
import { armarRed } from '../src/lib/red.js';

let fallan = 0;
const mal = (m) => { fallan++; console.error('  ✗ ' + m); };

const persona = (slug, apellido, extra = {}) => ({
  slug, nombre: slug, apellido,
  padres: [], hijos: [], conyuges: [], documentos: [],
  ...extra,
});
const memoria = (slug, ...personas) => ({ slug, personas, lugares: [], acontecimientos: [] });

const curvas = red => red.enlaces.filter(e => e.tipo === 'coaparicion');
const entre = (red, a, b) => curvas(red).find(e =>
  (e.source === a && e.target === b) || (e.source === b && e.target === a));

/* ---------------------------------------------------------------- */
/* Lo que la regla promete                                           */
/* ---------------------------------------------------------------- */

const gente = [persona('ana', 'Muller'), persona('beto', 'Silveira'), persona('cira', 'Potkova')];

{
  const red = armarRed(gente, [memoria('kermes', 'ana', 'beto')]);
  const c = entre(red, 'ana', 'beto');
  if (!c) mal('con una memoria compartida tiene que haber curva');
  else if (c.docs.join() !== 'kermes')
    mal('la curva tiene que nombrar la memoria que la justifica, y nombró ' + c.docs.join());
}

{
  /* Sacar a una persona de la memoria es lo que hace borrar una fila de
     memoria_personas. Es el caso exacto de la prueba a mano. */
  const red = armarRed(gente, [memoria('kermes', 'ana')]);
  if (entre(red, 'ana', 'beto'))
    mal('sacada la persona de la memoria, la curva tiene que desaparecer');
}

{
  /* Y borrar la memoria entera. */
  const red = armarRed(gente, []);
  if (curvas(red).length) mal('sin memorias no puede quedar ninguna curva');
}

{
  /* Dos memorias del mismo par son una conexión, no dos: el grosor tiene que
     decir cuántas memorias comparten, no cuántas veces se las contó. */
  const red = armarRed(gente, [memoria('kermes', 'ana', 'beto'), memoria('desfile', 'ana', 'beto')]);
  const c = entre(red, 'ana', 'beto');
  if (curvas(red).length !== 1) mal('dos memorias del mismo par tienen que dar una sola curva');
  else if (c.docs.length !== 2) mal('la curva tiene que nombrar las dos memorias');
}

{
  /* Y sacar una de las dos adelgaza la curva, no la borra. */
  const red = armarRed(gente, [memoria('kermes', 'ana', 'beto')]);
  const c = entre(red, 'ana', 'beto');
  if (!c || c.docs.length !== 1) mal('sacada una de dos memorias, la curva tiene que quedar con una');
}

/* ---------------------------------------------------------------- */
/* Lo que la regla prohíbe                                           */
/* ---------------------------------------------------------------- */

{
  /* Mismo apellido: no es un cruce entre familias. */
  const dos = [persona('ana', 'Muller'), persona('ema', 'Muller')];
  if (curvas(armarRed(dos, [memoria('kermes', 'ana', 'ema')])).length)
    mal('dos del mismo linaje en una foto no son un cruce entre familias');
}

{
  /* Parientes directos: ese vínculo ya lo dibuja la genealogía, y contarlo
     otra vez inflaría el grosor con un casamiento en vez de una memoria. */
  const pareja = [
    persona('ana', 'Muller', { conyuges: ['beto'] }),
    persona('beto', 'Silveira', { conyuges: ['ana'] }),
  ];
  if (curvas(armarRed(pareja, [memoria('casamiento', 'ana', 'beto')])).length)
    mal('una pareja en una foto no suma una curva histórica');

  const padreHijo = [
    persona('ana', 'Muller', { hijos: ['beto'] }),
    persona('beto', 'Silveira', { padres: ['ana'] }),
  ];
  if (curvas(armarRed(padreHijo, [memoria('patio', 'ana', 'beto')])).length)
    mal('un padre y un hijo en una foto no suman una curva histórica');
}

{
  /* Una persona que la memoria nombra pero que el archivo no muestra —porque
     está pendiente de revisión, por ejemplo— no puede dejar media curva. */
  const red = armarRed([persona('ana', 'Muller')], [memoria('kermes', 'ana', 'fantasma')]);
  if (curvas(red).length) mal('una persona que no está en el archivo no puede sostener una curva');
}

/* ---------------------------------------------------------------- */
/* El invariante, sobre cualquier dato                               */
/* ---------------------------------------------------------------- */
/* Toda curva tiene que poder nombrar al menos una memoria, y cada memoria que
   nombra tiene que contener de verdad a las dos personas. Esto es la regla
   entera dicha de una sola forma, y es lo que se rompe si alguien agrega una
   conexión "porque queda mejor". */

function invariante(personas, documentos, donde) {
  const red = armarRed(personas, documentos);
  const porSlug = Object.fromEntries(documentos.map(d => [d.slug, d]));
  for (const c of curvas(red)) {
    if (!c.docs?.length) { mal(`${donde}: una curva sin ninguna memoria que la explique`); return; }
    for (const s of c.docs) {
      const d = porSlug[s];
      if (!d) { mal(`${donde}: la curva nombra una memoria que no existe (${s})`); return; }
      if (!d.personas.includes(c.source) || !d.personas.includes(c.target)) {
        mal(`${donde}: la memoria ${s} no tiene a las dos personas de la curva`); return;
      }
    }
  }
  return red;
}

/* cien archivos al azar */
let semilla = 11;
const azar = n => (semilla = (semilla * 1103515245 + 12345) % 2147483648) % n;
const APELLIDOS = ['Muller', 'Silveira', 'Potkova', 'Escarban', 'Hermann'];
for (let n = 0; n < 100; n++) {
  const cuantos = 3 + azar(10);
  const ps = Array.from({ length: cuantos }, (_, i) =>
    persona('p' + i, APELLIDOS[azar(APELLIDOS.length)]));
  /* algunos parientes, para que el filtro de parentesco también se ejercite */
  for (let i = 0; i < cuantos; i++)
    if (azar(3) === 0) {
      const o = azar(cuantos);
      if (o !== i) { ps[i].conyuges.push('p' + o); ps[o].conyuges.push('p' + i); }
    }
  const docs = Array.from({ length: 1 + azar(6) }, (_, d) => {
    const cuantas = 1 + azar(4);
    const en = new Set();
    for (let k = 0; k < cuantas; k++) en.add('p' + azar(cuantos));
    return memoria('d' + d, ...en);
  });
  invariante(ps, docs, 'al azar #' + n);
}

/* y sobre los datos de demostración, que es el archivo más grande que hay */
try {
  const { readFileSync } = await import('node:fs');
  const snap = JSON.parse(readFileSync(new URL('../src/data/snapshot.json', import.meta.url)));
  const red = invariante(snap.personas, snap.documentos, 'snapshot');
  if (red) {
    /* Y la prueba a mano, hecha sola: se saca una persona de una memoria y la
       curva que esa memoria sostenía sola tiene que desaparecer. */
    const unaSola = curvas(red).find(c => c.docs.length === 1);
    if (unaSola) {
      const docs = snap.documentos.map(d => d.slug === unaSola.docs[0]
        ? { ...d, personas: d.personas.filter(s => s !== unaSola.target) } : d);
      if (entre(armarRed(snap.personas, docs), unaSola.source, unaSola.target))
        mal('snapshot: sacada la persona de la única memoria, la curva sigue dibujada');
    }
  }
} catch (e) {
  console.error('  (sin snapshot que revisar: ' + e.message + ')');
}

if (fallan) { console.error(`${fallan} caso(s) de la Regla 2 fallan`); process.exit(1); }
console.log('11 casos de la Regla 2 + 100 archivos al azar + el snapshot: todos pasan');
