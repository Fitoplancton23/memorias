import { construirLinaje, componentes, puentes, MEDIDAS } from '../src/lib/linaje-layout.js';
import { parseLinajes } from './linajes.mjs';

let fallos = 0;
const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA  ' + n); } };

/* grafo de prueba a partir del formato real de carga */
function grafo(texto) {
  const r = parseLinajes(texto);
  const P = Object.fromEntries(r.personas.map(p => [p.slug, { ...p, padres: [], hijos: [], conyuges: [], documentos: [] }]));
  for (const u of r.uniones) { P[u.a].conyuges.push(u.b); P[u.b].conyuges.push(u.a); }
  for (const f of r.filiaciones) for (const pa of f.padres) { P[f.hijo].padres.push(pa); P[pa].hijos.push(f.hijo); }
  return P;
}

const P = grafo([
  'Luis Dinarte Silveira y Clementina Hermann. Hijos: Gerardo Isaac Silveira, Celina Silveira, Susana Silveira, Oscar Silveira, Roberto Silveira',
  'Gerardo Isaac Silveira y Marta Kaiser. Hijos: Ana Silveira, Julio Silveira',
  'Pedro Lang y Eva Roth. Hijos: Marta Kaiser'
].join('\n'));

const L = construirLinaje('gerardo-isaac-silveira', P, { arriba: 2, abajo: 2 });
ok('devuelve un layout', !!L);
ok('el foco está presente', L.nodos.some(n => n.slug === 'gerardo-isaac-silveira'));
ok('los padres quedan una generación arriba',
  L.nodos.find(n => n.slug === 'luis-dinarte-silveira').gen === -1);
ok('los hijos quedan una generación abajo',
  L.nodos.find(n => n.slug === 'ana-silveira').gen === 1);
ok('se sube también por la rama de la esposa',
  L.nodos.find(n => n.slug === 'pedro-lang')?.gen === -1);
ok('cada pareja de abuelos queda contigua', (() => {
  const x = s => L.nodos.find(n => n.slug === s).x;
  const d = (a, b) => Math.abs(x(a) - x(b));
  return d('luis-dinarte-silveira', 'clementina-hermann') <= MEDIDAS.W + MEDIDAS.GX + 1
      && d('pedro-lang', 'eva-roth') <= MEDIDAS.W + MEDIDAS.GX + 1;
})());
ok('las cuatro ramas de abuelos no se pisan',
  new Set(L.nodos.filter(n => n.gen === -1).map(n => Math.round(n.x))).size === 4);

/* nadie dibujado dos veces */
const slugs = L.nodos.map(n => n.slug);
ok('ninguna persona repetida', slugs.length === new Set(slugs).size);

/* sin solapamientos dentro de una generación */
const porGen = {};
for (const n of L.nodos) (porGen[n.gen] ||= []).push(n);
let choques = 0;
for (const g of Object.values(porGen)) {
  g.sort((a, b) => a.x - b.x);
  for (let i = 1; i < g.length; i++) if (g[i].x - g[i-1].x < MEDIDAS.W) choques++;
}
ok(`sin tarjetas superpuestas (${choques} choques)`, choques === 0);

/* la pareja queda contigua */
const gg = L.nodos.find(n => n.slug === 'gerardo-isaac-silveira');
const mk = L.nodos.find(n => n.slug === 'marta-kaiser');
ok('la pareja está en la misma generación', gg.gen === mk.gen);
ok('la pareja está contigua', Math.abs(gg.x - mk.x) <= MEDIDAS.W + MEDIDAS.GX + 1);

/* los hijos quedan centrados bajo sus padres */
const hijos = L.nodos.filter(n => ['ana-silveira','julio-silveira'].includes(n.slug));
const centroHijos = (Math.min(...hijos.map(h=>h.x)) + Math.max(...hijos.map(h=>h.x))) / 2;
const centroPareja = (gg.x + mk.x) / 2;
ok(`hijos centrados bajo la pareja (desvío ${Math.abs(centroHijos-centroPareja).toFixed(1)}px)`,
   Math.abs(centroHijos - centroPareja) < 2);

ok('todo cae dentro del ancho declarado', L.nodos.every(n => n.x >= 0 && n.x <= L.ancho));
ok('hay enlaces de unión y de filiación',
   L.enlaces.some(e => e.tipo === 'union') && L.enlaces.some(e => e.tipo === 'filiacion'));

/* bosque */
const P2 = grafo([
  'Luis Silveira y Clementina Hermann. Hijos: Gerardo Silveira',
  'Otto Lang y Berta Muller. Hijos: Hilda Lang',
  'Solo Solitario'
].join('\n'));
const comps = componentes(Object.values(P2));
ok('detecta tres grupos separados', comps.length === 3);
ok('el grupo más grande va primero', comps[0].length >= comps[1].length);

const pu = puentes(Object.values(P2),
  [{ slug: 'doc-1', personas: ['gerardo-silveira', 'hilda-lang'] },
   { slug: 'doc-2', personas: ['gerardo-silveira'] }]);
ok('encuentra el puente entre dos grupos', pu.length === 1 && pu[0].documentos.length === 1);

console.log(fallos === 0 ? '17 casos de layout de linaje: todos pasan' : `${fallos} caso(s) fallan`);
process.exit(fallos ? 1 : 0);
