/* Dos toques seguidos y en el mismo punto son un doble toque. Dos toques
   lejos son dos toques, aunque vengan rápido: sin esa condición, tocar dos
   marcadores vecinos acercaría el mapa en vez de abrir el segundo. */
import { esDoble, VENTANA, RADIO } from '../src/lib/doble-toque.js';

let fallan = 0;
const caso = (nombre, a, b, esperado, op) => {
  const dio = esDoble(a, b, op);
  if (dio !== esperado) { fallan++; console.error(`  ✗ ${nombre}: esperaba ${esperado}`); }
};
const en = (t, x = 100, y = 100) => ({ t, x, y });

caso('sin toque anterior', null, en(0), false);
caso('el mismo punto, enseguida', en(0), en(120), true);
caso('el mismo punto, justo en el límite', en(0), en(VENTANA), true);
caso('el mismo punto, un milisegundo tarde', en(0), en(VENTANA + 1), false);
caso('el mismo punto, mucho después', en(0), en(2000), false);

caso('un dedo que se movió poco', en(0, 100, 100), en(120, 100 + RADIO, 100), true);
caso('dos marcadores vecinos', en(0, 100, 100), en(120, 100 + RADIO + 1, 100), false);
caso('lejos en diagonal', en(0, 100, 100), en(120, 160, 160), false);

caso('con una ventana más corta', en(0), en(200), false, { ventana: 150 });
caso('con un radio más grande', en(0, 100, 100), en(120, 180, 100), true, { radio: 100 });

if (fallan) { console.error(`${fallan} caso(s) de doble toque fallan`); process.exit(1); }
console.log('10 casos de doble toque: todos pasan');
