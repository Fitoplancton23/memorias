import { armarRed } from '../src/lib/red.js';
let fallos = 0;
const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA  ' + n); } };

const per = (slug, padres = [], hijos = [], conyuges = [], docs = []) =>
  ({ slug, nombre: slug, apellido: '', padres, hijos, conyuges, documentos: docs,
     nacimiento: { texto: '' }, defuncion: { texto: '' } });

const personas = [
  per('a', [], ['c'], ['b'], ['d1']), per('b', [], ['c'], ['a'], []),
  per('c', ['a','b'], [], [], ['d1','d2']),
  per('a2', [], ['c2'], ['a'], []), per('c2', ['a','a2'], [], [], []),  // segundas nupcias de a
  per('x', [], ['y'], [], ['d2']), per('y', ['x'], [], [], []),
  per('solo')
];
const familias = [
  { id: 'fam-1', conyuges: ['a','b'],  hijos: ['c'] },
  { id: 'fam-2', conyuges: ['a','a2'], hijos: ['c2'] },
  { id: 'fam-3', conyuges: ['x'],      hijos: ['y'] }   // monoparental
];
const docs = [{ slug:'d1', personas:['a','c'] }, { slug:'d2', personas:['c','x'] }];
const R = armarRed(personas, docs, familias);

const pers = R.nodos.filter(n => n.tipo === 'persona');
const nf   = R.nodos.filter(n => n.tipo === 'familia');
ok('un nodo por persona', pers.length === 8);
ok('un nodo por familia', nf.length === 3);
ok('el grafo es bipartito: ninguna arista de parentesco une dos personas',
   R.enlaces.filter(e => e.tipo !== 'coaparicion')
     .every(e => (String(e.source).startsWith('fam-')) !== (String(e.target).startsWith('fam-'))));

const conyA = R.enlaces.filter(e => e.tipo === 'conyuge' && e.source === 'a');
ok('"a" es cónyuge en dos uniones', conyA.length === 2);
ok('cada unión conserva su propio hijo',
   R.enlaces.some(e => e.tipo === 'hijo' && e.source === 'fam-1' && e.target === 'c') &&
   R.enlaces.some(e => e.tipo === 'hijo' && e.source === 'fam-2' && e.target === 'c2'));
ok('la familia monoparental tiene un solo cónyuge',
   nf.find(n => n.id === 'fam-3').conyuges.length === 1);
ok('la familia monoparental igual enlaza a su hijo',
   R.enlaces.some(e => e.tipo === 'hijo' && e.source === 'fam-3' && e.target === 'y'));

const co = R.enlaces.filter(e => e.tipo === 'coaparicion');
ok('un solo puente, c–x', co.length === 1 && co[0].source === 'c' && co[0].target === 'x');
ok('no hay puentes entre parientes', !co.some(e => e.source === 'a' && e.target === 'c'));
ok('marca a la persona suelta', pers.find(n => n.id === 'solo').suelto === true);
ok('el radio crece con las memorias',
   pers.find(n => n.id === 'c').r > pers.find(n => n.id === 'b').r);
ok('los nodos familia no llevan nombre ni tamaño de persona',
   nf.every(n => n.r <= 4 && !n.nombre));

console.log(fallos === 0 ? '12 casos de red: todos pasan' : `${fallos} caso(s) fallan`);
process.exit(fallos ? 1 : 0);
