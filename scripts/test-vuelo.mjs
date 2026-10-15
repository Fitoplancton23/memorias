/* El vuelo de entrada: si la cuenta está mal, el mapa sale de cuadro y vuelve
   a mitad de camino, y eso se lee como un error y no como un movimiento. */
import { centro, entre, suave } from '../src/lib/vuelo.js';

let fallan = 0;
const mal = m => { fallan++; console.error('  ✗ ' + m); };
const casi = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

const ANCHO = 2000, ALTO = 1686;
const a = { k: 1.2, x: -100, y: -60 };     /* el territorio */
const b = { k: 9.4, x: -8200, y: -5400 };  /* el casco */

/* los extremos son exactos: un vuelo que no empieza donde estaba o no termina
   donde va deja un salto, y el salto es justo lo que se quiso evitar */
for (const [nombre, t, esperado] of [['al empezar', 0, a], ['al terminar', 1, b]]) {
  const r = entre(a, b, t, ANCHO, ALTO);
  if (!casi(r.k, esperado.k, 1e-9) || !casi(r.x, esperado.x, 1e-6) || !casi(r.y, esperado.y, 1e-6))
    mal(`${nombre}: ${JSON.stringify(r)} en vez de ${JSON.stringify(esperado)}`);
}
/* y fuera de rango no se dispara */
if (JSON.stringify(entre(a, b, -3, ANCHO, ALTO)) !== JSON.stringify(entre(a, b, 0, ANCHO, ALTO)))
  mal('antes de empezar tiene que quedarse quieto');
if (JSON.stringify(entre(a, b, 7, ANCHO, ALTO)) !== JSON.stringify(entre(a, b, 1, ANCHO, ALTO)))
  mal('después de terminar tiene que quedarse quieto');

/* la escala no retrocede nunca, y siempre está entre las dos */
let kAnt = -Infinity;
for (let i = 0; i <= 100; i++) {
  const r = entre(a, b, i / 100, ANCHO, ALTO);
  if (r.k < kAnt - 1e-9) mal(`la escala retrocede en t=${i / 100}`);
  if (r.k < a.k - 1e-9 || r.k > b.k + 1e-9) mal(`la escala se va de rango en t=${i / 100}: ${r.k}`);
  kAnt = r.k;
}

/* GEOMÉTRICA y no en línea recta: a mitad de camino la escala es la media
   geométrica. Con la recta daría 5,3 y la primera mitad del vuelo pasaría
   volando mientras la segunda se arrastra. */
const medio = entre(a, b, .5, ANCHO, ALTO).k;
if (!casi(medio, Math.sqrt(a.k * b.k), 1e-9))
  mal(`a mitad de camino la escala tiene que ser la media geométrica (${Math.sqrt(a.k * b.k).toFixed(3)}), dio ${medio.toFixed(3)}`);
if (casi(medio, (a.k + b.k) / 2, .01))
  mal('está interpolando la escala en línea recta');

/* el centro de lo que se ve viaja derecho y sin volver: es lo que distingue
   un acercamiento de un tirón lateral */
let dAnt = 0, retrocesos = 0;
const c0 = centro(a, ANCHO, ALTO), c1 = centro(b, ANCHO, ALTO);
const total = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]);
for (let i = 0; i <= 100; i++) {
  const c = centro(entre(a, b, i / 100, ANCHO, ALTO), ANCHO, ALTO);
  const d = Math.hypot(c[0] - c0[0], c[1] - c0[1]);
  if (d < dAnt - 1e-6) retrocesos++;
  dAnt = d;
  /* y nunca se va más lejos de donde tiene que llegar */
  if (d > total + 1e-6) mal(`el centro se pasa de largo en t=${i / 100}`);
}
if (retrocesos) mal(`el centro vuelve para atrás ${retrocesos} veces: eso se ve como un tirón`);

/* centro(): el punto del mundo que queda en el medio de la pantalla */
const t0 = { k: 2, x: -500, y: -300 };
const c = centro(t0, ANCHO, ALTO);
if (!casi(c[0], (1000 + 500) / 2) || !casi(c[1], (843 + 300) / 2))
  mal('centro(): ' + JSON.stringify(c));
if (!casi(centro({ k: 0, x: 0, y: 0 }, ANCHO, ALTO)[0], 1000))
  mal('centro() con escala cero no puede dar infinito');

/* la curva: empieza y termina donde debe, no se pasa, y no es una recta */
if (!casi(suave(0), 0) || !casi(suave(1), 1)) mal('la curva tiene que ir de 0 a 1');
if (!casi(suave(.5), .5, 1e-9)) mal('la curva tiene que ser simétrica en el medio');
for (let i = 0; i <= 100; i++) {
  const v = suave(i / 100);
  if (v < -1e-9 || v > 1 + 1e-9) mal(`la curva se va de rango en ${i / 100}: ${v}`);
}
if (casi(suave(.25), .25, .02)) mal('la curva es una recta: no arranca ni frena despacio');
if (!(suave(.25) < .25)) mal('tiene que arrancar despacio');
if (!(suave(.75) > .75)) mal('tiene que frenar despacio');

if (fallan) { console.error(`${fallan} caso(s) de vuelo fallan`); process.exit(1); }
console.log('19 casos de vuelo de entrada: todos pasan');
