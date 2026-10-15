/* El vuelo de entrada: si la cuenta está mal, el mapa sale de cuadro y vuelve
   a mitad de camino, y eso se lee como un error y no como un movimiento. */
import { centro, entre, suave, encuadreDeCaja } from '../src/lib/vuelo.js';

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

/* ---------------------------------------------------------------------- */
/* El encuadre de entrada                                                  */
/* ---------------------------------------------------------------------- */
/* Lo que importa: el centro que se pide queda en el centro de la pantalla, y
   la caja entra entera. Nada de esto depende de los datos — ésa fue
   exactamente la falla: encuadrar "los lugares del casco" con un solo lugar
   cargado abría el mapa zambullido en ese marcador. */
const vista = { ancho: 2000, alto: 1686 };

{
  const caja = { cx: 900, cy: 800, ancho: 400, alto: 300 };
  const t = encuadreDeCaja(caja, vista, 0);
  const c = centro(t, vista.ancho, vista.alto);
  if (!casi(c[0], caja.cx, 1e-9) || !casi(c[1], caja.cy, 1e-9))
    mal(`el centro pedido tiene que quedar en el medio: dio ${c}`);
  /* Entra entera: los cuatro bordes caen dentro de lo que se ve. */
  for (const [px, py] of [[caja.cx - caja.ancho / 2, caja.cy - caja.alto / 2],
                          [caja.cx + caja.ancho / 2, caja.cy + caja.alto / 2]]) {
    const sx = px * t.k + t.x, sy = py * t.k + t.y;
    if (sx < -1e-6 || sx > vista.ancho + 1e-6 || sy < -1e-6 || sy > vista.alto + 1e-6)
      mal(`un borde de la caja queda afuera: ${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
}

/* El margen aleja, nunca acerca. */
{
  const caja = { cx: 1000, cy: 843, ancho: 400, alto: 300 };
  const sinM = encuadreDeCaja(caja, vista, 0).k;
  const conM = encuadreDeCaja(caja, vista, 120).k;
  if (!(conM < sinM)) mal('con margen tiene que alejarse, no acercarse');
  if (!casi(centro(encuadreDeCaja(caja, vista, 120), vista.ancho, vista.alto)[0], caja.cx, 1e-9))
    mal('el margen no puede mover el centro');
}

/* Manda el lado que no entra: una caja ancha y baja se ajusta por el ancho. */
{
  const anchaYBaja = encuadreDeCaja({ cx: 1000, cy: 843, ancho: 1800, alto: 10 }, vista, 0);
  if (!casi(anchaYBaja.k, 2000 / 1800, 1e-9)) mal('una caja ancha tiene que ajustarse por el ancho');
  const altaYFina = encuadreDeCaja({ cx: 1000, cy: 843, ancho: 10, alto: 1600 }, vista, 0);
  if (!casi(altaYFina.k, 1686 / 1600, 1e-9)) mal('una caja alta tiene que ajustarse por el alto');
}

/* Una caja de tamaño cero no puede dar escala infinita y dejar el mapa en
   blanco sin forma de volver. Los dos lados por separado: con `Math.min` de
   por medio, alcanza con que UN lado esté sin proteger para que el otro tape
   el agujero y el test dé verde. Eso pasó: la rotura a propósito no falló. */
for (const caja of [{ cx: 500, cy: 500, ancho: 0, alto: 0 },
                    { cx: 500, cy: 500, ancho: 0, alto: 400 },
                    { cx: 500, cy: 500, ancho: 400, alto: 0 }]) {
  const t = encuadreDeCaja(caja, vista, 0);
  if (!isFinite(t.k) || !isFinite(t.x) || !isFinite(t.y))
    mal(`caja ${caja.ancho}x${caja.alto}: no puede dar infinito`);
  /* Y tampoco una escala absurda: el tope del mapa es 40, y una entrada a
     mil aumentos deja al visitante adentro de un píxel. */
  if (t.k > 40 + 1e-9) mal(`caja ${caja.ancho}x${caja.alto}: escala disparada (${t.k})`);
}

/* El foco: dónde cae el centro de la caja. Cuando la pantalla y el dibujo no
   tienen la misma forma, el medio de lo que se ve y el medio del dibujo son
   dos puntos distintos — confundirlos corrió el centro 1276 m en el teléfono. */
{
  const vistaAlta = { ancho: 2000, alto: 4328 };   /* un teléfono */
  const caja = { cx: 980, cy: 820, ancho: 440, alto: 380 };
  const conFoco = encuadreDeCaja(caja, vistaAlta, 120, [1000, 843]);
  /* el centro de la caja tiene que caer exactamente en el foco pedido */
  if (!casi(caja.cx * conFoco.k + conFoco.x, 1000, 1e-9) ||
      !casi(caja.cy * conFoco.k + conFoco.y, 843, 1e-9))
    mal('con foco, el centro de la caja tiene que caer en el foco');
  /* y sin foco cae en el medio de la vista, que acá NO es el mismo punto */
  const sinFoco = encuadreDeCaja(caja, vistaAlta, 120);
  if (casi(sinFoco.y, conFoco.y, 1))
    mal('el foco tiene que cambiar algo cuando la vista no es el dibujo');
  /* la escala no la toca el foco */
  if (!casi(sinFoco.k, conFoco.k, 1e-12)) mal('el foco no puede cambiar la escala');
}

/* La escala sale de la vista de verdad, no del viewBox: con la misma caja,
   una pantalla más alta tiene que permitir MÁS acercamiento, no menos. */
{
  const caja = { cx: 1000, cy: 843, ancho: 440, alto: 380 };
  const comoViewBox = encuadreDeCaja(caja, { ancho: 2000, alto: 1686 }, 120).k;
  const comoTelefono = encuadreDeCaja(caja, { ancho: 2000, alto: 4328 }, 120).k;
  if (!(comoTelefono >= comoViewBox))
    mal(`una vista más alta no puede dar menos escala (${comoTelefono} < ${comoViewBox})`);
}

/* Y el que de verdad importa: el encuadre NO cambia si cambian los datos.
   La misma caja da la misma transformación, siempre. */
{
  const caja = { cx: 1234, cy: 567, ancho: 300, alto: 200 };
  const a1 = JSON.stringify(encuadreDeCaja(caja, vista, 60));
  const a2 = JSON.stringify(encuadreDeCaja({ ...caja }, { ...vista }, 60));
  if (a1 !== a2) mal('el mismo encuadre tiene que dar siempre lo mismo');
}

if (fallan) { console.error(`${fallan} caso(s) de vuelo fallan`); process.exit(1); }
console.log('36 casos de vuelo de entrada: todos pasan');
