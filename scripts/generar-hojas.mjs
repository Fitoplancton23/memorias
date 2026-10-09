/* Ilustración botánica para el fondo — tres estructuras distintas.
   =========================================================================
   El intento anterior tenía un solo molde parametrizado, y por más que se le
   sortearan el largo y el ancho todas las hojas salían de la misma familia:
   alargadas, puntiagudas, con la misma nervadura. Se leían como formas
   vectoriales, no como una ilustración.

   Acá hay tres constructores con morfología propia:

     ramaOvalada  — hojas ovadas y elípticas, anchas, de tamaños muy
                    distintos, sobre un tallo fino.
     follaje      — pocas hojas grandes y marcadamente asimétricas, con
                    nervadura broquidódroma: las secundarias se arquean antes
                    de llegar al borde y se enlazan con la siguiente, que es
                    lo que hace que una hoja se lea subtropical y no un óvalo.
     helecho      — raquis curvo con pinnas que decrecen hacia la punta. Sin
                    nervadura: a tamaño real no se vería, y un detalle que
                    desaparece es peso de archivo y nada más.

   Dos cosas que valen para las tres:

   · El margen ondula. Una silueta perfectamente lisa es el delator número uno
     de una forma calculada; una perturbación de tres o cuatro ciclos y amplitud
     chica la vuelve orgánica sin que se note de dónde sale.
   · Los tallos son TRAZOS, no superficies rellenas. Se afinan en tres tramos
     con grosor decreciente, que a estos tamaños es indistinguible de un ancho
     continuo y pesa una décima parte.                                        */

const R = (s => () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296)(7723441);
const entre = (a, b) => a + R() * (b - a);
const f1 = v => Math.round(v * 10) / 10;

/* Catmull-Rom → Bézier. */
function suave(pts, cerrado = false) {
  const p = pts.slice();
  if (cerrado) p.push(p[0]);
  let d = `M${f1(p[0][0])},${f1(p[0][1])}`;
  const g = i => p[Math.max(0, Math.min(p.length - 1, i))];
  for (let i = 0; i < p.length - 1; i++) {
    const [x0, y0] = g(i - 1), [x1, y1] = g(i), [x2, y2] = g(i + 1), [x3, y3] = g(i + 2);
    d += ` C${f1(x1 + (x2 - x0) / 6)},${f1(y1 + (y2 - y0) / 6)}`
       + ` ${f1(x2 - (x3 - x1) / 6)},${f1(y2 - (y3 - y1) / 6)}`
       + ` ${f1(x2)},${f1(y2)}`;
  }
  return d + (cerrado ? ' Z' : '');
}

const perfil = (t, p, q) => {
  const tm = p / (p + q);
  return (Math.pow(t, p) * Math.pow(1 - t, q)) / (Math.pow(tm, p) * Math.pow(1 - tm, q));
};

/* Una hoja con DOS perfiles, uno por lado: ahí está la asimetría de verdad.
   Un solo perfil corrido da una hoja torcida; dos perfiles distintos dan una
   hoja cuyo lado de arriba es más lleno abajo y el de abajo más lleno arriba,
   que es lo que pasa en una hoja real.                                       */
function hoja({ largo, anchoA, anchoB, pA, qA, pB, qB, arqueo, goteo, onda, ciclos, pasos }) {
  /* Menos muestras en las hojas chicas: una pinna de helecho de 20 px no
     necesita catorce puntos por lado, y multiplicada por cuarenta son treinta
     kilobytes de nada. */
  const N = pasos || (largo > 70 ? 14 : largo > 35 ? 10 : 7), TB = .9;
  const cuerpo = largo * (1 - goteo);
  const eje = t => arqueo * Math.sin(Math.PI * Math.pow(t, .8));
  /* Dos senos de frecuencias inconmensurables. Con uno solo el margen queda
     festoneado a intervalos iguales y la hoja se lee como un arce de dibujito;
     con dos, la irregularidad no tiene período y pasa por natural. La amplitud
     bajó a menos de la mitad: a 740 px los festones del primer intento eran
     hombros, no ondulación. */
  const rizo = (t, lado) => onda * Math.sin(Math.PI * t) *
    (Math.sin(Math.PI * 2 * ciclos * t + lado * 1.7) * .62 +
     Math.sin(Math.PI * 2 * ciclos * 1.618 * t + lado * .4) * .38);
  const arr = [], aba = [], med = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * TB, x = cuerpo * t, e = eje(t);
    const wa = perfil(t, pA, qA) * anchoA, wb = perfil(t, pB, qB) * anchoB;
    arr.push([x, e - wa - rizo(t, 0)]);
    aba.push([x, e + wb + rizo(t, 1)]);
    med.push([x, e + (wb - wa) / 2]);
  }
  /* La cola arranca del ancho que traía el limbo y baja a cero siguiendo el
     mismo eje curvo de la hoja. Sin esto la punta salía desviada y parecía un
     pico pegado al costado. */
  const wfA = perfil(TB, pA, qA) * anchoA, wfB = perfil(TB, pB, qB) * anchoB;
  const eFin = eje(1);
  for (const [k, u] of [[.58, .0], [.24, .5], [0, 1]]) {
    const xx = cuerpo + (largo - cuerpo) * u;
    const e = eFin + (eje(1) - eje(.9)) * u * .4;
    arr.push([xx, e - wfA * k]); aba.push([xx, e + wfB * k]); med.push([xx, e + (wfB - wfA) * k / 2]);
  }
  return { contorno: suave([...arr, ...aba.slice().reverse()], true), med, N, cuerpo, largo,
           ancho: (anchoA + anchoB) / 2 };
}

/* Sin nervadura. Se dibujó —central y secundarias broquidódromas— y se sacó:
   dentro de una hoja translúcida de fondo, cualquier línea interior se lee
   como un trazo encima y no como parte de la hoja, y a tamaño real sólo
   ensucia la silueta. Lo que hace botánica a una hoja acá es su contorno, no
   su anatomía interna. Afuera también se llevó un tercio del peso.         */

/* Tallos como trazo, en tramos que se afinan. */
function tallo(pts, g0, g1, color, op) {
  const n = pts.length, tramos = 3, s = [];
  for (let k = 0; k < tramos; k++) {
    const a = Math.floor(k * (n - 1) / tramos), b = Math.ceil((k + 1) * (n - 1) / tramos);
    const w = g0 + (g1 - g0) * ((k + .5) / tramos);
    s.push(`<path class="tallo" d="${suave(pts.slice(a, b + 1))}" stroke="${color}" stroke-opacity="${op}" stroke-width="${f1(w)}" />`);
  }
  return s.join('');
}

const VERDES = [
  ['#93a98f', '#6e8872'], ['#a2b6a6', '#7b9484'], ['#a8ad8c', '#868c6b'],
  ['#8ea79a', '#6b8378'], ['#b4bda3', '#90997c'], ['#9db09b', '#74897a'],
];

function pintarHoja(h, c1, c2, op) {
  return `<path class="limbo" d="${h.contorno}" fill="${c1}" fill-opacity="${f1(op * 100) / 100}" stroke="${c2}" stroke-opacity="${f1(op * 45) / 100}" />`;
}

/* ---------- A · rama de hojas ovaladas, anchas y de tamaños dispares ------ */
function ramaOvalada() {
  const curva = t => [16 + 262 * Math.pow(t, .92), 288 - 250 * t + 40 * Math.sin(Math.PI * t * .9)];
  const pts = []; for (let i = 0; i <= 30; i++) pts.push(curva(i / 30));
  let s = tallo(pts, 2.6, 1.1, '#78907c', .5);
  const TAM = [1, .56, .86, .42, 1.12, .66, .34];
  for (let k = 0; k < 7; k++) {
    const t = .12 + .74 * (k / 6);
    const [x, y] = curva(t), [x2, y2] = curva(Math.min(1, t + .03)), [x0, y0] = curva(Math.max(0, t - .03));
    const dir = Math.atan2(y2 - y0, x2 - x0) * 180 / Math.PI;
    const lado = k % 2 ? 1 : -1;
    const largo = 42 + 46 * TAM[k];
    const ra = entre(.33, .46);
    const h = hoja({
      largo, anchoA: largo * ra, anchoB: largo * ra * entre(.72, .95),
      pA: entre(1.15, 1.6), qA: entre(.95, 1.3), pB: entre(1.0, 1.45), qB: entre(1.0, 1.45),
      arqueo: lado * largo * entre(.03, .1), goteo: entre(.05, .11),
      onda: largo * entre(.006, .013), ciclos: 2 + Math.floor(R() * 3),
    });
    const [c1, c2] = VERDES[k % VERDES.length];
    const op = entre(.4, .72), pec = largo * entre(.08, .14);
    s += `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(dir + lado * (62 + entre(-22, 22)))})">`
      + `<path class="tallo" d="M0,0 Q${f1(pec * .6)},${f1(lado * pec * .12)} ${f1(pec)},0" stroke="${c2}" stroke-opacity="${f1(op * 55) / 100}" stroke-width="1.3" />`
      + `<g transform="translate(${f1(pec)},0)">${pintarHoja(h, c1, c2, op)}</g></g>`;
  }
  return s;
}

/* ---------- B · follaje subtropical: pocas hojas, grandes, asimétricas ---- */
function follaje() {
  const curva = t => [30 + 120 * Math.pow(t, 1.1), 292 - 214 * t - 26 * Math.sin(Math.PI * t)];
  const pts = []; for (let i = 0; i <= 24; i++) pts.push(curva(i / 24));
  let s = tallo(pts, 3.4, 1.5, '#6f8874', .5);
  const CFG = [
    { t: .08, lado: -1, largo: 148, ra: .40, ang: 58, tono: 0 },
    { t: .33, lado: 1, largo: 124, ra: .34, ang: 44, tono: 4 },
    { t: .57, lado: -1, largo: 112, ra: .38, ang: 66, tono: 2 },
    { t: .8, lado: 1, largo: 84, ra: .32, ang: 40, tono: 5 },
  ];
  CFG.forEach((c, k) => {
    const [x, y] = curva(c.t), [x2, y2] = curva(Math.min(1, c.t + .04)), [x0, y0] = curva(Math.max(0, c.t - .04));
    const dir = Math.atan2(y2 - y0, x2 - x0) * 180 / Math.PI;
    const h = hoja({
      largo: c.largo,
      anchoA: c.largo * c.ra, anchoB: c.largo * c.ra * entre(.6, .78),
      pA: entre(1.3, 1.7), qA: entre(.85, 1.1), pB: entre(.95, 1.25), qB: entre(1.15, 1.5),
      arqueo: c.lado * c.largo * entre(.05, .12), goteo: entre(.1, .17),
      onda: c.largo * entre(.005, .011), ciclos: 2 + Math.floor(R() * 2),
    });
    const [c1, c2] = VERDES[c.tono];
    const op = entre(.3, .6), pec = c.largo * entre(.1, .16);
    s += `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(dir + c.lado * c.ang)})">`
      + `<path class="tallo" d="M0,0 Q${f1(pec * .6)},${f1(c.lado * pec * .18)} ${f1(pec)},0" stroke="${c2}" stroke-opacity="${f1(op * 6) / 10}" stroke-width="1.7" />`
      + `<g transform="translate(${f1(pec)},0)">${pintarHoja(h, c1, c2, op)}</g></g>`;
  });
  return s;
}

/* ---------- C · helecho: raquis con pinnas que decrecen ------------------- */
function helecho() {
  /* Una fronda, no una pluma de comas. El primer intento tenía las pinnas
     grandes, muy arqueadas y con la punta ganchuda, y al superponerse se leían
     como escamas. Una pinna de helecho es angosta, casi recta, se apoya ancha
     en el raquis y apenas se inclina hacia la punta; lo que da la textura es
     que sean MUCHAS y chicas, no que sean vistosas. */
  const curva = t => [10 + 268 * Math.pow(t, .9), 292 - 262 * t + 62 * Math.sin(Math.PI * t * .78)];
  const pts = []; for (let i = 0; i <= 30; i++) pts.push(curva(i / 30));
  const [c1, c2] = ['#9fb49c', '#74897a'];
  let s = tallo(pts, 1.8, .6, c2, .42);
  const N = 21;
  for (let k = 0; k < N; k++) {
    const t = .04 + .92 * (k / (N - 1)) + (k && k < N - 1 ? entre(-.012, .012) : 0);
    const [x, y] = curva(t), [x2, y2] = curva(Math.min(1, t + .025)), [x0, y0] = curva(Math.max(0, t - .025));
    const dir = Math.atan2(y2 - y0, x2 - x0) * 180 / Math.PI;
    const merma = Math.pow(1 - t, .62);
    for (const lado of [-1, 1]) {
      const largo = 9 + 34 * merma * entre(.86, 1.14);
      if (largo < 7) continue;
      const h = hoja({
        largo, anchoA: largo * entre(.2, .27), anchoB: largo * entre(.18, .25),
        pA: 1.35, qA: 1.15, pB: 1.25, qB: 1.3,
        arqueo: lado * largo * entre(.03, .08), goteo: entre(.07, .13),
        onda: 0, ciclos: 1, pasos: 7,
      });
      const op = entre(.26, .44) * (.6 + .4 * merma);
      s += `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(dir + lado * (56 - t * 12) + entre(-6, 6))})">`
        + `<path class="limbo" d="${h.contorno}" fill="${c1}" fill-opacity="${f1(op * 100) / 100}" stroke="${c2}" stroke-opacity="${f1(op * 30) / 100}" />`
        + `</g>`;
    }
  }
  return s;
}

/* Escribe src/lib/botanica.js, que es lo que importa el fondo. El dibujo se
   genera una vez acá y queda estático: en el navegador no corre nada de esto.
   Para retocar las hojas se tocan los parámetros de arriba y se vuelve a
   correr `node scripts/generar-hojas.mjs`. */
import { writeFileSync } from 'node:fs';
const ramas = { ovalada: ramaOvalada(), follaje: follaje(), helecho: helecho() };
const cab = `/* GENERADO por scripts/generar-hojas.mjs — no editar a mano.
   Tres estructuras botánicas para el fondo: una rama de hojas ovaladas, un
   follaje subtropical de pocas hojas grandes y asimétricas, y una fronda de
   helecho. Cada una en su propio viewBox de 300x300.

   Sin nervadura, a propósito: se dibujó y se sacó. Dentro de una hoja
   translúcida de fondo, cualquier línea interior se lee como un trazo encima y
   no como parte de la hoja, y a tamaño real sólo ensucia la silueta. Lo que
   hace botánica a una hoja acá es su contorno. */\n`;
writeFileSync(new URL('../src/lib/botanica.js', import.meta.url),
  cab + Object.entries(ramas)
    .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`).join('\n') + '\n');
console.log(Object.entries(ramas).map(([k, v]) => `${k}: ${(v.length / 1024).toFixed(1)} KB`).join('  ·  '));
