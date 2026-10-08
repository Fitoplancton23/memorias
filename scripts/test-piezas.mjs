/* Las piezas compartidas del panel. Viven aparte desde que la pantalla de
   armar familias necesitó el mismo buscador que el asistente de memorias, y
   lo que se comparte entre dos pantallas es justo lo que no puede romperse en
   silencio: un plegado de tildes que deje de funcionar hace que alguien no
   encuentre a su abuela y concluya que no está en el archivo. */
import { sinTildes, filtrar, unico } from '../src/lib/panel/piezas.js';

let fallos = 0;
const ok = (q, bien) => { if (!bien) { fallos++; console.log('FALLA  ' + q); } };

/* --- se escribe de apuro y sin acentos --- */
ok('pliega tildes', sinTildes('Hernán Göllner') === 'hernan gollner');
ok('pliega la ñ', sinTildes('Muñoz') === 'munoz');
ok('no explota con vacío', sinTildes(null) === '' && sinTildes(undefined) === '');

const gente = [
  { id: 1, nombre: 'Morocha', apellido: 'Fontana', apodo: 'la Morocha' },
  { id: 2, nombre: 'Hernann', apellido: 'Signer', apodo: null },
  { id: 3, nombre: 'José', apellido: 'Muñoz', apodo: 'el Negro' },
];
const campos = p => [p.nombre, p.apellido, p.apodo];
const ids = xs => xs.map(x => x.id);

ok('encuentra por apellido', ids(filtrar(gente, 'signer', campos)).join() === '2');
ok('encuentra sin tilde lo escrito con tilde', ids(filtrar(gente, 'jose', campos)).join() === '3');
ok('encuentra "Munoz" a Muñoz', ids(filtrar(gente, 'munoz', campos)).join() === '3');
ok('encuentra por apodo', ids(filtrar(gente, 'el negro', campos)).join() === '3');
/* Un buscador vacío que devuelve todo abre una lista de trescientos nombres
   debajo del campo apenas se hace foco. */
ok('con la consulta vacía no devuelve nada', filtrar(gente, '', campos).length === 0);
ok('con sólo espacios tampoco', filtrar(gente, '   ', campos).length === 0);
ok('lo que no está, no está', filtrar(gente, 'zzz', campos).length === 0);
ok('un apodo nulo no rompe la búsqueda', filtrar(gente, 'hern', campos).length === 1);

/* --- el slug es la dirección pública, con índice único encima --- */
const hay = s => s.map(slug => ({ slug }));
ok('si está libre, se usa tal cual', unico('juan-silveira', hay([])) === 'juan-silveira');
ok('el segundo lleva número', unico('juan-silveira', hay(['juan-silveira'])) === 'juan-silveira-2');
ok('y el tercero sigue', unico('juan-silveira', hay(['juan-silveira', 'juan-silveira-2'])) === 'juan-silveira-3');
ok('sin base, no queda vacío', unico('', hay([])) === 'sin-nombre');
ok('sin base y ya tomado, también numera',
   unico('', hay(['sin-nombre'])) === 'sin-nombre-2');

if (fallos) { console.log(`${fallos} caso(s) fallan`); process.exit(1); }
console.log('15 casos de piezas del panel: todos pasan');
