import { alinearGrilla, construirGrilla, GRILLA } from '../src/lib/grilla.js';
const { COL, FILA, HUECO } = GRILLA;
let fallos = 0;
const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA  ' + n); } };

const per = id => ({ id });
const personas = ['abuelo','abuela','padre','madre','foco','hermana','esposa','hijo1','hijo2',
                  'esposa2','hijo3','suegro','suegra'].map(per);
const familias = [
  { id: 'f-abuelos', conyuges: ['abuelo','abuela'], hijos: ['padre'] },
  { id: 'f-suegros', conyuges: ['suegro','suegra'], hijos: ['madre'] },
  { id: 'f-padres',  conyuges: ['padre','madre'],   hijos: ['foco','hermana'] },
  { id: 'f-foco1',   conyuges: ['foco','esposa'],   hijos: ['hijo1','hijo2'] },
  { id: 'f-foco2',   conyuges: ['foco','esposa2'],  hijos: ['hijo3'] }
];
const G = construirGrilla('foco', personas, familias, { arriba: 2, abajo: 2 });
const en = id => G.nodos.find(n => n.id === id);

ok('devuelve una grilla', !!G);
ok('el foco queda en el origen', en('foco').x === 0 && en('foco').y === 0);
ok('los padres una fila arriba', en('padre').y === -FILA && en('madre').y === -FILA);
ok('los abuelos dos filas arriba', en('abuelo').y === -2 * FILA);
ok('los hijos una fila abajo', en('hijo1').y === FILA && en('hijo3').y === FILA);
ok('la hermana en la misma fila que el foco', en('hermana').y === 0);

/* filas exactas: sin esto no hay lectura genealógica */
const filas = new Set(G.nodos.map(n => n.y));
ok('todas las filas son múltiplos exactos de FILA',
   [...filas].every(y => Number.isInteger(y / FILA)));

/* parejas contiguas y a la misma altura */
const d = (a, b) => Math.abs(en(a).x - en(b).x);
ok('la pareja del foco es contigua', d('foco','esposa') <= COL + HUECO + 0.5);
ok('los padres son una pareja contigua', d('padre','madre') <= COL + HUECO + 0.5);
ok('los cónyuges están a la misma altura', en('foco').y === en('esposa').y);

/* segundas nupcias: un cónyuge a cada lado */
ok('las dos esposas quedan a lados opuestos',
   Math.sign(en('esposa').x - en('foco').x) !== Math.sign(en('esposa2').x - en('foco').x));

/* nadie superpuesto dentro de una fila */
let choques = 0;
for (const y of filas) {
  const fila = G.nodos.filter(n => n.y === y).sort((a, b) => a.x - b.x);
  for (let i = 1; i < fila.length; i++) if (fila[i].x - fila[i-1].x < COL - 0.5) choques++;
}
ok(`sin superposiciones en las filas (${choques})`, choques === 0);

ok('ninguna persona repetida', G.nodos.length === new Set(G.nodos.map(n => n.id)).size);
ok('una unión por familia dibujada', G.uniones.length >= 4);

const u1 = G.uniones.find(u => u.id === 'f-foco1');
ok('la unión queda entre los dos cónyuges',
   Math.abs(u1.x - (en('foco').x + en('esposa').x) / 2) < .5);
ok('los hijos quedan centrados bajo su unión', (() => {
  const xs = u1.hijos.map(h => en(h).x);
  return Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - u1.x) < .5;
})());

if (fallos) { console.log(`${fallos} caso(s) fallan`); process.exit(1); }

/* el peine de los padres debe alcanzar a todos los hermanos */
{
  const G2 = construirGrilla('foco', personas, familias, { arriba: 2, abajo: 2 });
  const u = G2.uniones.find(x => x.id === 'f-padres');
  const bien = u && u.hijos.includes('foco') && u.hijos.includes('hermana');
  if (!bien) { console.log('FALLA  el peine de los padres alcanza a los hermanos'); process.exit(1); }
}

/* --- elegir a otro de la misma familia no mueve a nadie -------------------
   La grilla se centra en el foco, así que entre dos hermanos sale el mismo
   dibujo corrido una columna. Ese deslizamiento no significa nada y tapa el
   movimiento que sí significa algo. */
{
  const prev = new Map();
  const base = construirGrilla('foco', personas, familias, { arriba: 2, abajo: 2 });
  for (const n of base.nodos) prev.set(n.id, { x: n.x, y: n.y });

  const otro = construirGrilla('hermana', personas, familias, { arriba: 2, abajo: 2 });
  const corrido = otro.nodos.find(n => n.id === 'foco').x !== prev.get('foco').x;
  ok('sin fijar, elegir a la hermana corre a la familia', corrido);

  const r = alinearGrilla(otro, prev);
  ok('la grilla de la hermana se reconoce como la misma', r.igual === true);
  ok('y nadie queda en otro lugar',
     otro.nodos.every(n => Math.abs(n.x - prev.get(n.id).x) < .001
                        && Math.abs(n.y - prev.get(n.id).y) < .001));

  /* Si el dibujo cambia de verdad —falta alguien— no se fija nada y la
     transición queda, que es lo que hace legible que algo cambió. */
  const recortada = new Map(prev); recortada.delete('hermana');
  const otra2 = construirGrilla('hermana', personas, familias, { arriba: 2, abajo: 2 });
  /* Con distinta gente no es «la misma», pero igual se la pega a lo que había:
     mover a los que no cambiaron es el deslizamiento que no dice nada. */
  const r2 = alinearGrilla(otra2, recortada);
  ok('con distinta gente no es la misma', r2.igual === false);
  ok('pero igual se alinea con lo que ya estaba', r2.alineada === true);
  ok('y los que estaban quedan donde estaban',
     otra2.nodos.filter(n => recortada.has(n.id))
       .every(n => Math.abs(n.x - recortada.get(n.id).x) < .001));
  const r3 = alinearGrilla(construirGrilla('hermana', personas, familias, { arriba: 2, abajo: 2 }), new Map());
  ok('sin posiciones previas no hay con qué alinear', r3.alineada === false);

  /* Una grilla movida de forma despareja no es una traslación. */
  const torcida = new Map();
  for (const n of base.nodos) torcida.set(n.id, { x: n.x + (n.id === 'foco' ? 40 : 0), y: n.y });
  const otra3 = construirGrilla('foco', personas, familias, { arriba: 2, abajo: 2 });
  ok('un corrimiento desparejo no cuenta como la misma grilla',
     alinearGrilla(otra3, torcida).igual === false);
}

if (fallos) { console.log(`${fallos} caso(s) fallan`); process.exit(1); }
console.log('25 casos de grilla: todos pasan');
