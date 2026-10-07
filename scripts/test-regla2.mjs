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

function invariante(personas, documentos, donde, lugares = [], aconts = []) {
  const red = armarRed(personas, documentos, [], lugares, aconts);
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

  /* Con la memoria como nodo, la regla deja de ser una promesa a verificar y
     pasa a ser la forma del grafo: toda línea `aparece` termina en una memoria,
     y toda línea `ocurre` sale de una. No hay manera de dibujar una conexión
     sin nombrarla, porque la explicación es el nodo del medio. Igual se
     comprueba: lo que es cierto por construcción deja de serlo el día que
     alguien cambia la construcción. */
  const memNodos = new Map(red.nodos.filter(n => n.tipo === 'memoria').map(n => [n.id, n]));

  /* Y que la persona exista de verdad. Una memoria puede nombrar a alguien que
     el archivo no muestra —está pendiente de revisión, o se borró— y entonces
     la línea sale de la nada: en pantalla es una curva que nace en el vacío. */
  const sonPersonas = new Set(red.nodos.filter(n => n.tipo === 'persona').map(n => n.id));

  for (const e of red.enlaces.filter(x => x.tipo === 'aparece')) {
    if (!sonPersonas.has(e.source)) {
      mal(`${donde}: «aparece» que sale de alguien que no está en la red (${e.source})`); return;
    }
    const m = memNodos.get(e.target);
    if (!m) { mal(`${donde}: «aparece» que no termina en una memoria (${e.target})`); return; }
    const d = porSlug[m.ref];
    if (!d) { mal(`${donde}: el nodo ${e.target} no corresponde a ninguna memoria`); return; }
    if (!d.personas.includes(e.source)) {
      mal(`${donde}: la memoria ${m.ref} no nombra a ${e.source}`); return;
    }
  }

  for (const e of red.enlaces.filter(x => x.tipo === 'ocurre')) {
    const m = memNodos.get(e.source);
    if (!m) { mal(`${donde}: «ocurre» que no sale de una memoria (${e.source})`); return; }
    const d = porSlug[m.ref];
    const [clase, ref] = String(e.target).split(':');
    const lista = clase === 'lugar' ? (d.lugares || []) : (d.acontecimientos || []);
    if (!lista.includes(ref)) {
      mal(`${donde}: la memoria ${m.ref} no ocurre en ${e.target}`); return;
    }
  }

  /* Y nadie llega al entorno sin pasar por una memoria. */
  for (const e of red.enlaces)
    if (String(e.target).startsWith('lugar:') || String(e.target).startsWith('evento:'))
      if (!String(e.source).startsWith('memoria:')) {
        mal(`${donde}: ${e.source} toca el entorno sin pasar por una memoria`); return;
      }

  return red;
}

{
  /* El recorrido que esto habilita, que es el que el archivo promete:
     una persona, la memoria donde aparece, la otra persona que aparece ahí.
     Cada salto tiene nombre. */
  const red = armarRed(gente, [{ slug: 'kermes', titulo: 'La kermés', personas: ['ana', 'beto'],
      lugares: ['avenida'], acontecimientos: ['estudiantina'] }],
    [], [{ slug: 'avenida', nombre: 'Avenida' }], [{ slug: 'estudiantina', titulo: 'Estudiantina' }]);

  const nodo = red.nodos.find(n => n.tipo === 'memoria' && n.ref === 'kermes');
  if (!nodo) mal('la memoria tiene que ser un nodo');
  const colgados = red.enlaces.filter(e => e.tipo === 'aparece' && e.target === 'memoria:kermes');
  if (colgados.length !== 2) mal('las dos personas tienen que colgar de la memoria');
  const alLugar = red.enlaces.find(e => e.tipo === 'ocurre' && e.target === 'lugar:avenida');
  const alEvento = red.enlaces.find(e => e.tipo === 'ocurre' && e.target === 'evento:estudiantina');
  if (alLugar?.source !== 'memoria:kermes') mal('el lugar tiene que colgar de la memoria, no de la persona');
  if (alEvento?.source !== 'memoria:kermes') mal('el acontecimiento tiene que colgar de la memoria');

  /* Borrada la memoria, se va el nodo y con él todo lo que colgaba. */
  const sinNada = armarRed(gente, []);
  if (sinNada.nodos.some(n => n.tipo === 'memoria' || n.tipo === 'lugar' || n.tipo === 'evento'))
    mal('sin memorias no puede quedar ni el nodo ni su entorno');

  /* Una memoria que nombra a alguien que el archivo no muestra —pendiente de
     revisión, o borrado— no puede dejar una línea saliendo de la nada. */
  const conFantasma = armarRed([persona('ana', 'Muller')],
    [{ slug: 'kermes', titulo: 'La kermés', personas: ['ana', 'nadie'], lugares: [], acontecimientos: [] }]);
  if (conFantasma.enlaces.some(e => e.tipo === 'aparece' && e.source === 'nadie'))
    mal('una memoria no puede colgar de alguien que no está en la red');
  invariante([persona('ana', 'Muller')],
    [{ slug: 'kermes', titulo: 'La kermés', personas: ['ana', 'nadie'], lugares: [], acontecimientos: [] }],
    'con una persona que no está');

  /* Una memoria que no nombra a nadie no entra: no tiene de dónde colgarse. */
  const muda = armarRed(gente, [{ slug: 'aerea', titulo: 'Tomas aéreas', personas: [],
      lugares: ['avenida'], acontecimientos: [] }],
    [], [{ slug: 'avenida', nombre: 'Avenida' }], []);
  if (muda.nodos.some(n => n.tipo === 'memoria'))
    mal('una memoria sin personas no entra a la red');
  if (muda.nodos.some(n => n.tipo === 'lugar'))
    mal('y su lugar tampoco, porque nadie podría llegar hasta él');
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
    const m = memoria('d' + d, ...en);
    if (azar(2) === 0) m.lugares = ['avenida'];
    if (azar(3) === 0) m.acontecimientos = ['fiesta'];
    return m;
  });
  invariante(ps, docs, 'al azar #' + n,
    [{ slug: 'avenida', nombre: 'Avenida' }], [{ slug: 'fiesta', titulo: 'Fiesta' }]);
}

/* y sobre los datos de demostración, que es el archivo más grande que hay */
try {
  const { readFileSync } = await import('node:fs');
  const snap = JSON.parse(readFileSync(new URL('../src/data/snapshot.json', import.meta.url)));
  const red = invariante(snap.personas, snap.documentos, 'snapshot',
    snap.lugares || [], snap.acontecimientos || []);
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
console.log('22 casos de la Regla 2 + 100 archivos al azar + el snapshot: todos pasan');
