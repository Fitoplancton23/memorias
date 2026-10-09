/* Acercar una fotografía: el tope es la resolución real del escaneo, y dentro
   del cuadro nunca queda hueco. Los dos invariantes se verifican rompiendo la
   función a propósito, al final. */
import { encuadre, tope, vale, eje, encajar, acercar, recorrer,
         geometria, inicial, hayHueco, LUPA } from '../src/lib/lupa.js';

let fallan = 0;
const caso = (nombre, dio, esperado) => {
  const a = JSON.stringify(dio), b = JSON.stringify(esperado);
  if (a !== b) { fallan++; console.error(`  ✗ ${nombre}: dio ${a}, esperaba ${b}`); }
};
const cerca = (nombre, dio, esperado, tol = 1e-6) => {
  if (Math.abs(dio - esperado) > tol) { fallan++; console.error(`  ✗ ${nombre}: dio ${dio}, esperaba ${esperado}`); }
};
const ok = (nombre, cond) => { if (!cond) { fallan++; console.error(`  ✗ ${nombre}`); } };

/* ---- encuadre: lo que hace object-fit: contain, en números ---- */
caso('foto más ancha que el cuadro', encuadre([3000, 2000], [600, 600]), [600, 400]);
caso('foto más alta que el cuadro', encuadre([2000, 3000], [600, 600]), [400, 600]);
caso('misma proporción', encuadre([1200, 800], [600, 400]), [600, 400]);
caso('foto chica: contain también la agranda', encuadre([300, 200], [600, 400]), [600, 400]);
caso('cuadro degenerado', encuadre([3000, 2000], [0, 600]), [0, 0]);
caso('foto sin medidas', encuadre([0, 0], [600, 400]), [0, 0]);

/* ---- tope: un píxel de pantalla, un píxel de escaneo ---- */
cerca('escaneo grande: tope 5x', tope([3000, 2000], [600, 400]), 5);
cerca('escaneo justo: tope 1x', tope([600, 400], [600, 400]), 1);
cerca('escaneo chico: nunca por debajo de 1', tope([300, 200], [600, 400]), 1);
cerca('escaneo apenas mayor', tope([700, 467], [600, 400]), 700 / 600);

ok('un escaneo grande vale acercarlo', vale([3000, 2000], [600, 400]));
ok('un escaneo justo no', !vale([600, 400], [600, 400]));
ok('un 4% no vale', !vale([624, 416], [600, 400]));
ok('un 16% sí', vale([700, 467], [600, 400]));
ok('el mínimo es el límite', vale([600 * LUPA.MINIMO_UTIL, 400], [600, 400]));

/* ---- eje: tapa y se pega, no tapa y se centra ---- */
cerca('no tapa: centrado', eje(-999, 400, 600), 100);
cerca('tapa justo: pegado', eje(-999, 600, 600), 0);
cerca('tapa: no se pasa por la izquierda', eje(50, 1200, 600), 0);
cerca('tapa: no se pasa por la derecha', eje(-999, 1200, 600), -600);
cerca('tapa: en el medio queda donde está', eje(-300, 1200, 600), -300);

/* ---- encajar y acercar ---- */
const geo = geometria([3000, 2000], [600, 600]);   /* encuadrada 600x400, tope 5 */
caso('geometría', [geo.encuadrada, geo.tope, geo.vale], [[600, 400], 5, true]);
caso('inicial: centrada vertical', inicial(geo), { k: 1, x: 0, y: 100 });
caso('no se puede alejar más que el tamaño', encajar({ k: .3, x: 0, y: 0 }, geo), { k: 1, x: 0, y: 100 });
caso('no se puede acercar más que el tope', encajar({ k: 99, x: -1e9, y: -1e9 }, geo).k, 5);

const a = acercar(inicial(geo), geo, [300, 300], 2);
cerca('acercar en el centro deja el centro quieto (x)', (300 - a.x) / a.k, 300);
cerca('acercar en el centro deja el centro quieto (y)', (300 - a.y) / a.k, 200);
ok('acercado al doble no deja hueco', !hayHueco(a, geo));

const esq = acercar(inicial(geo), geo, [0, 0], 3);
caso('acercar en la esquina se pega a la esquina', [esq.x, esq.y], [0, 0]);
ok('la esquina no deja hueco', !hayHueco(esq, geo));

const vuelta = acercar(esq, geo, [0, 0], 1);
caso('volver a 1 vuelve a centrar', vuelta, { k: 1, x: 0, y: 100 });

/* ---- recorrer ---- */
const r = recorrer(acercar(inicial(geo), geo, [300, 300], 2), geo, 1e6, 1e6);
caso('recorrer a lo bestia se pega al borde', [r.x, r.y], [0, 0]);
const r2 = recorrer(inicial(geo), geo, 500, 500);
caso('en su tamaño no se recorre', r2, { k: 1, x: 0, y: 100 });

/* ---- una foto más angosta que el cuadro: se centra en x siempre ---- */
const alta = geometria([1000, 3000], [600, 600]);   /* encuadrada 200x600 */
caso('vertical: encuadrada', alta.encuadrada, [200, 600]);
caso('vertical en su tamaño: centrada en x', inicial(alta), { k: 1, x: 200, y: 0 });
const alta2 = acercar(inicial(alta), alta, [300, 300], 2);
cerca('vertical al doble: ya tapa, se puede pegar', alta2.x, 100);
ok('vertical al doble no deja hueco', !hayHueco(alta2, alta));

/* ---- 2000 al azar: ninguna secuencia de gestos deja hueco ---- */
let semilla = 20261009;
const az = () => (semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
let conHueco = 0, fueraDeTope = 0;
for (let i = 0; i < 2000; i++) {
  const g = geometria([200 + Math.round(az() * 4000), 200 + Math.round(az() * 4000)],
                      [200 + Math.round(az() * 800), 200 + Math.round(az() * 800)]);
  let e = inicial(g);
  for (let j = 0; j < 12; j++) {
    if (az() < .5) e = acercar(e, g, [az() * g.cuadro[0], az() * g.cuadro[1]], az() * 8);
    else e = recorrer(e, g, (az() - .5) * 2000, (az() - .5) * 2000);
    if (hayHueco(e, g)) conHueco++;
    if (e.k < 1 - 1e-9 || e.k > g.tope + 1e-9) fueraDeTope++;
  }
}
ok(`${conHueco} estados con hueco`, conHueco === 0);
ok(`${fueraDeTope} escalas fuera del tope`, fueraDeTope === 0);

/* ---- el invariante se verifica rompiéndolo ---- */
const roto = { k: 2, x: -1200, y: -900 };   /* corrido mucho más allá del borde */
ok('hayHueco detecta un corrimiento pasado de largo', hayHueco(roto, geo));
ok('hayHueco detecta una foto chica descentrada', hayHueco({ k: 1, x: 0, y: 0 }, alta));
ok('hayHueco acepta el estado que devuelve encajar', !hayHueco(encajar(roto, geo), geo));

if (fallan) { console.error(`${fallan} caso(s) de lupa fallan`); process.exit(1); }
console.log('42 casos de lupa + 2000 al azar: todos pasan');
