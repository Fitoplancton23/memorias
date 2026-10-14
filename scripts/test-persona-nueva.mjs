/* Una persona sin nombre, sin apellido y sin apodo no se puede nombrar, no se
   puede buscar y no se puede mostrar. La regla va cubierta. */
import { partir, sirve, comoSeLlama, baseSlug, fila } from '../src/lib/persona-nueva.js';

let fallan = 0;
const mal = m => { fallan++; console.error('  ✗ ' + m); };
const es = (nombre, dio, esperado) => {
  const a = JSON.stringify(dio), b = JSON.stringify(esperado);
  if (a !== b) mal(`${nombre}: esperaba ${b}, dio ${a}`);
};

/* partir: la heurística de la última palabra */
es('nombre y apellido', partir('Juan Potkova'), { nombre: 'Juan', apellido: 'Potkova', apodo: '' });
es('una sola palabra es nombre', partir('Goya'), { nombre: 'Goya', apellido: '', apodo: '' });
es('tres palabras', partir('Ana Maria Souza'), { nombre: 'Ana Maria', apellido: 'Souza', apodo: '' });
es('espacios de más', partir('  Juan   Potkova  '), { nombre: 'Juan', apellido: 'Potkova', apodo: '' });
es('vacío', partir(''), { nombre: '', apellido: '', apodo: '' });
es('sólo espacios', partir('   '), { nombre: '', apellido: '', apodo: '' });
es('nada', partir(null), { nombre: '', apellido: '', apodo: '' });

/* sirve: uno de los tres alcanza, ninguno no */
if (!sirve({ nombre: 'Juan' })) mal('con sólo nombre alcanza');
if (!sirve({ apellido: 'Potkova' })) mal('con sólo apellido alcanza — "Alumnos: Potschka y Prevelis"');
if (!sirve({ apodo: 'el Negro' })) mal('con sólo apodo alcanza — el caso que faltaba');
if (!sirve({ nombre: 'Juan', apellido: 'Potkova', apodo: 'Pepe' })) mal('con los tres, obvio');
if (sirve({})) mal('sin ninguno NO alcanza: una fila que no se puede nombrar');
if (sirve({ nombre: '', apellido: '', apodo: '' })) mal('tres vacíos no alcanzan');
if (sirve({ nombre: '  ', apellido: '\t', apodo: '\n' })) mal('espacios en blanco no son un nombre');
if (sirve(null)) mal('sin nada no alcanza');

/* cómo se la nombra */
es('nombre completo', comoSeLlama({ nombre: 'Juan', apellido: 'Potkova' }), 'Juan Potkova');
es('sólo apellido', comoSeLlama({ apellido: 'Prevelis' }), 'Prevelis');
es('sólo nombre', comoSeLlama({ nombre: 'Goya' }), 'Goya');
es('sólo apodo', comoSeLlama({ apodo: 'el Negro' }), 'el Negro');
/* Con nombre propio, el apodo NO se mete en el rótulo: la ficha ya lo muestra
   aparte, y meterlo acá lo duplicaría en toda la pantalla. */
es('el apodo no se suma al nombre',
   comoSeLlama({ nombre: 'Roberto', apellido: 'Silveira', apodo: 'el Negro' }), 'Roberto Silveira');
es('sin nada, cadena vacía', comoSeLlama({}), '');

/* la dirección pública sale de lo mismo que se ve */
es('slug de quien sólo tiene apodo', baseSlug({ apodo: 'el Negro' }), 'el Negro');
es('slug normal', baseSlug({ nombre: 'Juan', apellido: 'Potkova' }), 'Juan Potkova');

/* la fila: los vacíos van NULL, no cadena vacía */
es('fila completa', fila({ nombre: 'Juan', apellido: 'Potkova', apodo: 'Pepe' }),
   { nombre: 'Juan', apellido: 'Potkova', apodo: 'Pepe' });
es('fila con sólo apodo', fila({ apodo: 'el Negro' }),
   { nombre: null, apellido: null, apodo: 'el Negro' });
es('los vacíos son NULL y no cadena vacía', fila({ nombre: 'Goya', apellido: '', apodo: '  ' }),
   { nombre: 'Goya', apellido: null, apodo: null });
es('sin ninguno no hay fila', fila({ nombre: ' ', apellido: '', apodo: '' }), null);
/* Que no quede ni una cadena vacía: '' afirma que el apellido es la cadena
   vacía, y eso es una afirmación, no un hueco. */
for (const p of [{ nombre: 'A', apellido: '' }, { apodo: 'B', nombre: '' }, { apellido: 'C' }]) {
  const f = fila(p);
  if (Object.values(f).some(v => v === '')) mal('quedó una cadena vacía en ' + JSON.stringify(f));
}

/* el camino entero: lo que se escribe de un tirón sigue sirviendo */
const p = partir('Juan Potkova');
if (!sirve(p) || comoSeLlama(p) !== 'Juan Potkova') mal('partir y dar de alta tienen que encajar');

if (fallan) { console.error(`${fallan} caso(s) de alta de persona fallan`); process.exit(1); }
console.log('31 casos de alta de persona: todos pasan');
