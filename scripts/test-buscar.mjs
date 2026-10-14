/* El buscador falla en silencio: cuando no encuentra, devuelve vacío, y vacío
   se lee como "esa persona no está en el archivo". Por eso va cubierto. */
import { calza, plano, otrosNombres, calzaMemoria, buscarMemorias, comoSeEncontro } from '../src/lib/buscar.js';

let fallan = 0;
const caso = (nombre, consulta, persona, esperado) => {
  const r = calza(consulta, persona);
  const dio = r === null ? null : (r.por || 'sí');
  if (dio !== esperado) {
    fallan++;
    console.error(`  ✗ ${nombre}: esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(dio)}`);
  }
};

const roberto = { nombre: 'Roberto Silveira', apodo: 'Beto; el Negro' };
const nelida  = { nombre: 'Nélida Ramírez', apodo: null };
const tana    = { nombre: 'María Angélica Bertolini', apodo: 'la Tana' };

/* lo básico */
caso('por el nombre', 'roberto', roberto, 'sí');
caso('por el apellido', 'silveira', roberto, 'sí');
caso('nombre y apellido', 'roberto silveira', roberto, 'sí');
caso('en otro orden', 'silveira roberto', roberto, 'sí');
caso('no está', 'gonzalez', roberto, null);
caso('consulta vacía', '', roberto, null);
caso('sólo espacios', '   ', roberto, null);

/* sin tildes, que es como se escribe desde el celular */
caso('nelida sin tilde', 'nelida', nelida, 'sí');
caso('ramirez sin tilde', 'ramirez', nelida, 'sí');
caso('con la tilde puesta', 'Ramírez', nelida, 'sí');
caso('mayúsculas', 'NELIDA RAMIREZ', nelida, 'sí');
caso('angelica sin tilde', 'angelica', tana, 'sí');

/* por el apodo, que es como se busca en el pueblo */
caso('el apodo corto', 'beto', roberto, 'Beto');
caso('el alias', 'el negro', roberto, 'el Negro');
caso('el alias sin el artículo', 'negro', roberto, 'el Negro');
caso('la Tana', 'tana', tana, 'la Tana');
caso('apodo y apellido juntos', 'negro silveira', roberto, 'el Negro');
caso('apodo con mayúscula', 'El Negro', roberto, 'el Negro');

/* el nombre alcanza: no hay nada que explicar */
caso('no inventa un porqué', 'roberto', roberto, 'sí');
caso('ni cuando hay apodos', 'roberto silveira', roberto, 'sí');

/* lo que no tiene que calzar */
caso('una palabra de más', 'roberto silveira gonzalez', roberto, null);
caso('apodo de otro', 'tana', roberto, null);

/* las piezas sueltas */
/* La ñ se pliega a propósito: se está buscando, no escribiendo. Alguien que
   tipea "Munoz" desde un teclado sin ñ tiene que encontrar a Muñoz. */
if (plano('Ñandú Pérez') !== 'nandu perez') {
  fallan++; console.error('  ✗ plano: la ñ tiene que plegarse como el resto');
}
caso('munoz sin la ñ', 'munoz', { nombre: 'Rosa Muñoz', apodo: null }, 'sí');
caso('munoz con la ñ', 'Muñoz', { nombre: 'Rosa Muñoz', apodo: null }, 'sí');
if (otrosNombres(roberto).join('|') !== 'Beto|el Negro') {
  fallan++; console.error('  ✗ otrosNombres: no separa bien el campo del snapshot');
}
if (otrosNombres(nelida).length !== 0) {
  fallan++; console.error('  ✗ otrosNombres: sin apodo tiene que dar vacío');
}


/* ---------------------------------------------------------------------- */
/* Buscar una memoria                                                      */
/* ---------------------------------------------------------------------- */
const baile = { slug: 'baile', titulo: 'Baile del club', texto: 'La orquesta vino de Oberá.',
  gente: [{ nombre: 'Roberto Silveira', otros: ['el Negro'] },
          { nombre: 'Nélida Müller', otros: [] },
          { nombre: 'Rosa Silveira', otros: [] }],
  lugares: ['Club Social'], hechos: ['Carnaval'], anio: 1958 };
const acto = { slug: 'acto', titulo: 'Acto escolar', texto: '',
  gente: [{ nombre: 'Juan Potkova', otros: [] }],
  lugares: ['Escuela 425'], hechos: [], anio: 1948 };
const suelta = { slug: 'suelta', titulo: 'Grupo familiar', texto: '', gente: [], lugares: [], hechos: [], anio: null };
const archivo = [baile, acto, suelta];

const mem = (nombre, consulta, m, esperado) => {
  const r = calzaMemoria(consulta, m);
  const dio = r === null ? null : (r.por || 'sí');
  if (dio !== esperado) {
    fallan++;
    console.error(`  ✗ ${nombre}: esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(dio)}`);
  }
};

/* La frase que se le muestra a quien buscó. Una sola para todo el sitio. */
const dicho = (nombre, consulta, m, esperado) => {
  const dio = comoSeEncontro(calzaMemoria(consulta, m));
  if (dio !== esperado) {
    fallan++;
    console.error(`  ✗ ${nombre}: esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(dio)}`);
  }
};

mem('por el título', 'baile', baile, 'sí');
mem('por el título, sin tilde ni mayúscula', 'BAILE DEL CLUB', baile, 'sí');
mem('por el lugar', 'club social', baile, 'Club Social');
mem('por la persona', 'potkova', acto, 'Juan Potkova');
mem('por el apodo, que es como se nombra acá', 'negro', baile, 'Roberto Silveira (el Negro)');
mem('por el apodo sin tilde', 'nelida', baile, 'Nélida Müller');
mem('la ñ se pliega para buscar', 'muller', baile, 'Nélida Müller');
mem('por el acontecimiento', 'carnaval', baile, 'Carnaval');
mem('por el año', '1948', acto, '1948');
mem('por el relato, plegando la tilde de Oberá', 'obera', baile, 'el relato');
mem('por el relato', 'orquesta', baile, 'el relato');
/* En un pueblo el apellido se repite, así que la explicación tiene que ser la
   del hilo que cubre más de lo escrito y no la del primero que calza una
   palabra: "rosa silveira" es Rosa, aunque Roberto venga antes y también sea
   un Silveira. Esto apareció con los datos de verdad, no en los de prueba. */
mem('el apellido compartido no roba la explicación', 'rosa silveira', baile, 'Rosa Silveira');
mem('y al revés también', 'roberto silveira', baile, 'Roberto Silveira');
mem('las palabras se reparten entre campos', 'escuela 1948', acto, 'Escuela 425');
mem('título y lugar juntos', 'acto escuela', acto, 'Escuela 425');
mem('una palabra que no está no encuentra nada', 'panadería', baile, null);
mem('todas las palabras tienen que estar', 'baile 1948', baile, null);
mem('consulta vacía no encuentra nada', '', baile, null);
mem('consulta de espacios no encuentra nada', '   ', baile, null);
mem('una memoria sin nada más que título se encuentra igual', 'grupo', suelta, 'sí');
mem('y no se la encuentra por un año que no tiene', '1958', suelta, null);

/* Quien en el pueblo ES su apodo y nada más. Desde que una persona se puede
   cargar sólo con el apodo, su nombre en pantalla es el apodo, y el hilo de
   la persona y el del apodo dicen lo mismo. La explicación no puede salir
   «por el apodo el Turco (el Turco)». */
const soloApodo = { slug: 'turco', titulo: 'Procesion', texto: '', anio: 1950,
  lugares: [], hechos: [], gente: [{ nombre: 'el Turco', otros: ['el Turco'] }] };
dicho('quien es su apodo no se explica dos veces', 'turco', soloApodo, 'por el Turco');
mem('y se la encuentra igual', 'turco', soloApodo, 'el Turco');

/* El orden de la explicación: la persona antes que el lugar.
   Acá hace falta una memoria donde los dos hilos calcen con la MISMA palabra,
   o el test no fija nada: con "silveira club" el lugar no contiene "silveira"
   y la persona gana sola, aunque el orden estuviera al revés. En el pueblo
   pasa seguido —los lugares se llaman como las familias— y ahí la pregunta es
   real: quien busca "silveira" busca a la persona, no a la casa. */
const casa = { slug: 'casa', titulo: 'Frente de la casa', texto: '',
  gente: [{ nombre: 'Roberto Silveira', otros: ['el Negro'] }],
  lugares: ['Casa de Silveira'], hechos: [], anio: null };
const r1 = calzaMemoria('silveira', casa);
if (!r1 || r1.que !== 'persona') {
  fallan++; console.error(`  ✗ con persona y lugar homónimos, explica por la persona (dio ${r1 && r1.que})`);
}
/* Y lo que se muestra es el nombre entero, no el apodo entre paréntesis.
   (Esto no fija el orden persona/apodo: el hilo del apodo guarda sólo el
   apodo, así que una búsqueda por nombre nunca puede caer ahí. Fija que el
   resultado se explique con el nombre como lo escribe la familia.) */
const r2 = calzaMemoria('roberto', casa);
if (!r2 || r2.por !== 'Roberto Silveira') {
  fallan++; console.error(`  ✗ el nombre explica antes que el apodo (dio ${r2 && r2.por})`);
}

/* La lista: el invariante es que todo lo que devuelve contiene todas las
   palabras. Si alguna vez se cuela algo que no las tiene, el buscador deja de
   ser confiable sin que se note. */
const consultas = ['club', 'negro', '1948', 'escuela 425', 'acto', 'zzz', 'baile club'];
let coladas = 0;
for (const q of consultas) {
  const partes = plano(q).split(/\s+/).filter(Boolean);
  for (const m of buscarMemorias(q, archivo)) {
    const todo = plano([m.titulo, m.texto,
      ...(m.gente || []).flatMap(p => [p.nombre, ...(p.otros || [])]),
      ...(m.lugares || []), ...(m.hechos || []), m.anio].join(' '));
    if (!partes.every(w => todo.includes(w))) coladas++;
  }
}
if (coladas) { fallan++; console.error(`  ✗ ${coladas} resultado(s) sin todas las palabras`); }

if (buscarMemorias('zzz', archivo).length !== 0) {
  fallan++; console.error('  ✗ una consulta que no calza tiene que dar la lista vacía');
}
if (buscarMemorias('a', archivo).length === 0) {
  fallan++; console.error('  ✗ una letra sola tiene que encontrar algo en este archivo');
}

dicho('el apodo se nombra como apodo', 'negro', baile, 'por el apodo Roberto Silveira (el Negro)');
dicho('la persona se nombra sola', 'potkova', acto, 'por Juan Potkova');
dicho('el lugar se nombra como lugar', 'club social', baile, 'por el lugar Club Social');
dicho('el año se nombra como año', '1948', acto, 'por el año 1948');
dicho('el acontecimiento se nombra solo', 'carnaval', baile, 'por Carnaval');
dicho('el relato no se cita, se señala', 'orquesta', baile, 'por algo que dice el relato');
/* Cuando el título ya tenía todo, no hay nada que explicar: una línea que
   dijera "por el título" debajo del título es ruido. */
dicho('el título no se explica a sí mismo', 'baile', baile, '');
dicho('lo que no calza no dice nada', 'panaderia', baile, '');

if (fallan) { console.error(`${fallan} caso(s) de búsqueda fallan`); process.exit(1); }
console.log('62 casos de búsqueda: todos pasan');
