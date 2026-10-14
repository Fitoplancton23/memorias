/* Una memoria relacionada sin razón escrita es una afirmación del archivo que
   nadie puede verificar. Por eso va cubierto. */
import { relacionadas, porQue, PESOS } from '../src/lib/relacionadas.js';

let fallan = 0;
const mal = m => { fallan++; console.error('  ✗ ' + m); };

const NOMBRES = {
  'juan': 'Juan Potkova', 'rosa': 'Rosa Muñoz', 'negro': 'Roberto Silveira',
  'escuela': 'Escuela 425', 'plaza': 'Plaza Libertad',
  'carnaval': 'Carnaval', 'luz': 'Llegada de la luz',
};
const m = (slug, anio, personas, lugares, acontecimientos) =>
  ({ slug, fecha: { ref: anio }, personas, lugares, acontecimientos });

const base   = m('base',   1948, ['juan', 'rosa'], ['escuela'], ['luz']);
const conJuan= m('conJuan',1960, ['juan'],         [],          []);
const soloEsc= m('soloEsc',1972, ['negro'],        ['escuela'], []);
const soloAnio=m('soloAnio',1948,['negro'],        ['plaza'],   []);
const ajena  = m('ajena',  1990, ['negro'],        ['plaza'],   []);
const todo   = m('todo',   1948, ['juan', 'rosa'], ['escuela'], ['luz']);
/* Dos que comparten exactamente lo mismo y sólo se distinguen por el año: sin
   un empate de verdad, el test del orden no fija nada —cualquier orden sale
   igual— y eso ya pasó una vez. */
const empateA = m('empateA', 1970, ['juan'], [], []);
const empateB = m('empateB', 1955, ['juan'], [], []);
const archivo = [base, conJuan, soloEsc, soloAnio, ajena, todo, empateA, empateB];

const r = relacionadas(base, archivo, NOMBRES);
const porSlug = Object.fromEntries(r.map(x => [x.slug, x]));

/* lo que tiene que estar y lo que no */
if (r.some(x => x.slug === 'base')) mal('no puede relacionarse consigo misma');
if (porSlug['ajena']) mal('una memoria sin nada en común no se relaciona');
if (!porSlug['conJuan']) mal('compartir una persona relaciona');
if (!porSlug['soloEsc']) mal('compartir el lugar relaciona');
if (!porSlug['soloAnio']) mal('compartir el año exacto relaciona');

/* toda relación viene con la razón escrita, y se puede decir en castellano */
for (const x of r) {
  if (!x.por || !x.que) mal(`«${x.slug}» sin razón: una relación que no se puede nombrar no se dibuja`);
  if (!porQue(x)) mal(`«${x.slug}» no se puede decir en una frase`);
}

/* la razón que se muestra es la más fuerte que haya */
if (porSlug['todo']?.que !== 'persona') mal('con todo en común, explica por la persona');
if (porSlug['soloEsc']?.que !== 'lugar') mal('sin gente en común, explica por el lugar');
if (porSlug['soloAnio']?.que !== 'anio') mal('sin nada más, explica por el año');
if (porQue(porSlug['conJuan']) !== 'También aparece Juan Potkova')
  mal('la frase de la persona: ' + porQue(porSlug['conJuan']));
if (porQue(porSlug['soloEsc']) !== 'También en Escuela 425')
  mal('la frase del lugar: ' + porQue(porSlug['soloEsc']));

/* a igual parecido, la más vieja primero, que es el orden del archivo */
const empatados = r.filter(x => ['conJuan', 'empateA', 'empateB'].includes(x.slug)).map(x => x.slug);
if (empatados.join(',') !== 'empateB,conJuan,empateA')
  mal('a igual parecido ordena por año: dio ' + empatados.join(','));

/* la más parecida va primero */
if (r[0].slug !== 'todo') mal('la que más comparte va primero, dio ' + r[0].slug);
if (!(porSlug['todo'].puntos > porSlug['conJuan'].puntos)) mal('compartir más tiene que puntuar más');
if (!(porSlug['conJuan'].puntos > porSlug['soloAnio'].puntos))
  mal('una persona compartida pesa más que el año');

/* el año suelto no puede ser lo que relacione medio archivo */
if (PESOS.anio >= PESOS.lugar) mal('el año no puede pesar tanto como el lugar');

/* una década compartida NO relaciona */
const otraDecada = m('otraDecada', 1949, ['negro'], ['plaza'], []);
if (relacionadas(base, [base, otraDecada], NOMBRES).length)
  mal('compartir la década no es compartir nada: para eso está el filtro');

/* el tope manda, porque una memoria de la plaza listaría el archivo entero */
const muchas = [base, ...Array.from({ length: 40 }, (_, i) =>
  m('p' + i, 1950 + i, ['juan'], [], []))];
const r2 = relacionadas(base, muchas, NOMBRES);
if (r2.length !== 8) mal('el tope por defecto son 8, dio ' + r2.length);
if (relacionadas(base, muchas, NOMBRES, 3).length !== 3) mal('el tope se puede pedir');

/* lo que no se puede nombrar no relaciona: si una persona no está en el
   índice de nombres, la pantalla no podría decir por qué la muestra */
const sinNombre = relacionadas(base, [base, conJuan], {});
if (sinNombre.length) mal('sin nombre que mostrar, no se relaciona');

/* una memoria sin fecha no se relaciona con otra sin fecha POR la fecha */
const sf1 = m('sf1', null, ['negro'], [], []), sf2 = m('sf2', null, ['rosa'], [], []);
if (relacionadas(sf1, [sf1, sf2], NOMBRES).length)
  mal('dos memorias sin fecha no comparten fecha: no saber no es coincidir');

/* el orden no puede depender del orden de entrada */
const a = relacionadas(base, archivo, NOMBRES).map(x => x.slug).join(',');
const b = relacionadas(base, [...archivo].reverse(), NOMBRES).map(x => x.slug).join(',');
if (a !== b) mal(`el orden cambia si cambia el de entrada:\n     ${a}\n     ${b}`);

/* sin nada, nada */
if (relacionadas(null, archivo, NOMBRES).length) mal('sin memoria, lista vacía');
if (relacionadas(base, [], NOMBRES).length) mal('sin archivo, lista vacía');

if (fallan) { console.error(`${fallan} caso(s) de memorias relacionadas fallan`); process.exit(1); }
console.log('23 casos de memorias relacionadas: todos pasan');
