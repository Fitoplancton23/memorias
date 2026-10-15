/* Una nota sin autor ni fecha no coordina nada: "faltan las fotos" cambia de
   significado según quién lo dijo y hace cuánto. */
import { cuando, firma, encabezado, rotuloBoton } from '../src/lib/notas.js';

let fallan = 0;
const mal = m => { fallan++; console.error('  ✗ ' + m); };
const es = (n, dio, esp) => { if (dio !== esp) mal(`${n}: esperaba ${JSON.stringify(esp)}, dio ${JSON.stringify(dio)}`); };

const ahora = new Date(2026, 9, 15, 14, 30);   /* 15 de octubre de 2026 */

es('de hace un rato', cuando(new Date(2026, 9, 15, 9, 0), ahora), 'hoy');
es('de recién', cuando(new Date(2026, 9, 15, 14, 29), ahora), 'hoy');
/* Por día del calendario y no por horas: anoche tarde es "ayer" aunque hayan
   pasado menos de veinticuatro horas. */
es('de anoche', cuando(new Date(2026, 9, 14, 23, 50), ahora), 'ayer');
es('de ayer temprano', cuando(new Date(2026, 9, 14, 0, 5), ahora), 'ayer');
es('de hace tres días', cuando(new Date(2026, 9, 12, 10, 0), ahora), '12 oct');
es('del mes pasado', cuando(new Date(2026, 8, 3, 10, 0), ahora), '3 sep');
/* De otro año lleva el año: "3 sep" sin más, dos años después, miente. */
es('del año pasado', cuando(new Date(2025, 8, 3, 10, 0), ahora), '3 sep 2025');
/* Un reloj adelantado no puede dar "en -1 días". */
es('del futuro', cuando(new Date(2026, 9, 16, 9, 0), ahora), 'hoy');
es('sin fecha', cuando(null, ahora), '');
es('fecha rota', cuando('no es una fecha', ahora), '');
/* Y tiene que entender lo que devuelve la base. */
if (!cuando(new Date(2026, 9, 15).toISOString(), ahora)) mal('tiene que leer una fecha ISO');

es('con nombre', firma({ autor: 'Facundo' }), 'Facundo');
es('con espacios', firma({ autor: '  Matías  ' }), 'Matías');
/* Sin autor se dice que falta; inventar un nombre en una nota de coordinación
   es peor que no tenerlo. */
es('sin autor', firma({ autor: '' }), 'Un administrador');
es('sin nada', firma(null), 'Un administrador');

es('el encabezado', encabezado({ autor: 'Facundo', creada_en: new Date(2026, 9, 15) }, ahora),
   'Facundo · hoy');
es('encabezado sin fecha', encabezado({ autor: 'Facundo' }, ahora), 'Facundo');

/* El botón dice cuántas hay sin abrirlas: si dijera sólo "Notas" habría que
   tocar cada memoria de la lista para saber si alguien dejó algo. */
es('sin notas', rotuloBoton(0), 'Dejar una nota');
es('sin notas (nada)', rotuloBoton(undefined), 'Dejar una nota');
es('una nota', rotuloBoton(1), '1 nota');
es('varias', rotuloBoton(4), '4 notas');

if (fallan) { console.error(`${fallan} caso(s) de notas fallan`); process.exit(1); }
console.log('19 casos de notas: todos pasan');
