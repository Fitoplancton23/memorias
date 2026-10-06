/* El buscador falla en silencio: cuando no encuentra, devuelve vacío, y vacío
   se lee como "esa persona no está en el archivo". Por eso va cubierto. */
import { calza, plano, otrosNombres } from '../src/lib/buscar.js';

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

if (fallan) { console.error(`${fallan} caso(s) de búsqueda fallan`); process.exit(1); }
console.log('24 casos de búsqueda: todos pasan');
