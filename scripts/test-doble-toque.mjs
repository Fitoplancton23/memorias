/* Dos toques seguidos y en el mismo punto son un doble toque. Dos toques
   lejos son dos toques, aunque vengan rápido: sin esa condición, tocar dos
   marcadores vecinos acercaría el mapa en vez de abrir el segundo. */
import { esDoble, enElLienzo, VENTANA, RADIO } from '../src/lib/doble-toque.js';

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

/* ---------------------------------------------------------------------- */
/* Hacia dónde acerca                                                      */
/* ---------------------------------------------------------------------- */
/* El invariante: el punto del dibujo que estaba debajo del dedo tiene que
   seguir debajo del dedo después de acercar. Si la conversión está mal, el
   mapa se va para otro lado — que es lo que pasaba en el teléfono. */
const ve = (nombre, dio, esperado) => {
  const a = JSON.stringify(dio.map(n => +n.toFixed(4)));
  const b = JSON.stringify(esperado);
  if (a !== b) { fallan++; console.error(`  ✗ ${nombre}: esperaba ${b}, dio ${a}`); }
};
const caja = { left: 0, top: 0 };

ve('sin escala ni bandas, el punto es el mismo',
   enElLienzo({ x: 200, y: 150 }, caja, { razon: 1, padX: 0, padY: 0 }), [200, 150]);

/* El caso del teléfono: 2000 unidades de dibujo en 390 px de pantalla. Un
   toque a 200 px cae en la unidad 1025, no en la 200. */
ve('un viewBox de 2000 en una pantalla de 390',
   enElLienzo({ x: 200, y: 300 }, caja, { razon: 0.195, padX: 0, padY: 0 }), [1025.641, 1538.4615]);

/* Las bandas que deja preserveAspectRatio al centrar: el contenido no
   empieza en el borde de la caja. */
ve('descuenta las bandas',
   enElLienzo({ x: 260, y: 200 }, caja, { razon: 0.5, padX: 60, padY: 40 }), [400, 320]);

/* La caja puede no empezar en el origen de la ventana: hay una barra arriba. */
ve('descuenta dónde empieza la caja',
   enElLienzo({ x: 300, y: 250 }, { left: 100, top: 50 }, { razon: 0.5 }), [400, 400]);

/* Sin datos de medida no puede devolver NaN: un NaN adentro de d3 deja el
   mapa en blanco y sin forma de volver. */
ve('sin medidas, se comporta', enElLienzo({ x: 40, y: 20 }, caja), [40, 20]);
ve('razón cero no divide por cero', enElLienzo({ x: 40, y: 20 }, caja, { razon: 0 }), [40, 20]);

/* Y el que importa de verdad, hecho como lo haría el mapa: convertir, acercar
   al doble alrededor de ese punto, y comprobar que lo que estaba bajo el dedo
   sigue bajo el dedo. */
/* `zoom.scaleBy(sel, k2, p0)`: p0 va en el espacio del elemento —unidades del
   viewBox—, d3 lo invierte por la transformación para saber qué punto del
   MUNDO está ahí, y arma la nueva transformación para que ese punto del mundo
   quede exactamente en p0. Confundir el punto fijo con un punto del mundo fue
   el primer error de este test: falló, y fallaba el test, no el código. */
const comoD3 = (t, k2, p0) => {
  const k = t.k * k2;
  const mundo = [(p0[0] - t.x) / t.k, (p0[1] - t.y) / t.k];
  return { k, x: p0[0] - mundo[0] * k, y: p0[1] - mundo[1] * k, mundo };
};
const aPantalla = (u, t, med, caj) =>
  ({ x: caj.left + med.padX + (u[0] * t.k + t.x) * med.razon,
     y: caj.top + med.padY + (u[1] * t.k + t.y) * med.razon });

for (const med of [{ razon: 0.195, padX: 0, padY: 120 }, { razon: 0.72, padX: 40, padY: 0 }]) {
  const caj = { left: 12, top: 60 };
  const t0 = { k: 1.4, x: -130, y: -80 };
  const dedo = { x: caj.left + 180, y: caj.top + 240 };
  const centro = enElLienzo(dedo, caj, med);
  const t1 = comoD3(t0, 2, centro);
  const despues = aPantalla(t1.mundo, t1, med, caj);
  if (Math.abs(despues.x - dedo.x) > 0.001 || Math.abs(despues.y - dedo.y) > 0.001) {
    fallan++;
    console.error(`  ✗ lo que estaba bajo el dedo se movió (razon ${med.razon}): ` +
      `${despues.x.toFixed(1)},${despues.y.toFixed(1)} en vez de ${dedo.x},${dedo.y}`);
  }
}

/* Y la comprobación de que el test sirve: con la conversión vieja —píxeles de
   pantalla sin convertir, que es lo que había— el punto bajo el dedo se va a
   cientos de píxeles. Si esto dejara de notarse, el test de arriba no estaría
   midiendo nada. */
{
  const med = { razon: 0.195, padX: 0, padY: 120 };
  const caj = { left: 12, top: 60 };
  const t0 = { k: 1.4, x: -130, y: -80 };
  const dedo = { x: caj.left + 180, y: caj.top + 240 };
  const viejo = [dedo.x - caj.left, dedo.y - caj.top];   /* lo que se pasaba antes */
  const t1 = comoD3(t0, 2, viejo);
  const d = aPantalla(t1.mundo, t1, med, caj);
  const corrido = Math.hypot(d.x - dedo.x, d.y - dedo.y);
  if (corrido < 50) {
    fallan++;
    console.error(`  ✗ la conversión vieja tendría que fallar feo y corrió sólo ${corrido.toFixed(0)} px`);
  }
}

if (fallan) { console.error(`${fallan} caso(s) de doble toque fallan`); process.exit(1); }
console.log('18 casos de doble toque: todos pasan');
