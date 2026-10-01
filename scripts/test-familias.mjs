/* La unidad conyugal es el corazón del modelo genealógico: un hijo pertenece a
   UNA unión concreta, no a un par de aristas sueltas. */
import { parseLinajes } from './linajes.mjs';

let fallos = 0;
const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA  ' + n); } };

/* misma agrupación que build-snapshot */
function familiasDe(texto) {
  const r = parseLinajes(texto);
  const fams = new Map();
  const fam = padres => {
    const k = padres.filter(Boolean).slice().sort().join('|');
    if (!k) return null;
    if (!fams.has(k)) fams.set(k, { conyuges: k.split('|'), hijos: [] });
    return fams.get(k);
  };
  for (const u of r.uniones) fam([u.a, u.b]);
  for (const f of r.filiaciones) { const x = fam(f.padres); if (x && !x.hijos.includes(f.hijo)) x.hijos.push(f.hijo); }
  return [...fams.values()];
}

const F = familiasDe([
  'Luis Silveira y Clementina Hermann. Hijos: Gerardo Silveira, Celina Silveira',
  'Luis Silveira y Rosa Weber. Hijos: Oscar Silveira',        // segundas nupcias
  'Ramona Duarte. Hijos: Juan Duarte',                        // monoparental
  'Pedro Lang y Eva Roth'                                     // unión sin hijos cargados
].join('\n'));

ok('cuatro familias', F.length === 4);

const dosUniones = F.filter(f => f.conyuges.includes('luis-silveira'));
ok('una persona puede estar en dos uniones', dosUniones.length === 2);
ok('cada unión conserva SUS hijos',
   dosUniones.some(f => f.hijos.includes('gerardo-silveira') && !f.hijos.includes('oscar-silveira')) &&
   dosUniones.some(f => f.hijos.includes('oscar-silveira') && !f.hijos.includes('gerardo-silveira')));

const mono = F.find(f => f.conyuges.length === 1);
ok('familia monoparental', mono && mono.conyuges[0] === 'ramona-duarte' && mono.hijos.length === 1);

const sinHijos = F.find(f => f.conyuges.includes('pedro-lang'));
ok('unión sin hijos cargados se conserva', sinHijos && sinHijos.hijos.length === 0);

ok('ningún hijo repetido dentro de una familia',
   F.every(f => f.hijos.length === new Set(f.hijos).size));
ok('ningún hijo en dos familias a la vez', (() => {
  const todos = F.flatMap(f => f.hijos);
  return todos.length === new Set(todos).size;
})());

/* el orden de los cónyuges no debe crear familias duplicadas */
const G = familiasDe('Eva Roth y Pedro Lang. Hijos: Ana Lang\nPedro Lang y Eva Roth. Hijos: Otto Lang');
ok('el orden de los cónyuges no duplica la familia', G.length === 1 && G[0].hijos.length === 2);

console.log(fallos === 0 ? '9 casos de familias: todos pasan' : `${fallos} caso(s) fallan`);
process.exit(fallos ? 1 : 0);
