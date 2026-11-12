import { curvaResorte, duracionResorte } from '../src/lib/resorte.js';

let mal = 0;
const ok = (q, c, extra = '') => { if (!c) { mal++; console.error(`  ✗ ${q} ${extra}`); } };
const puntos = s => s.slice('linear('.length, -1).split(',').map(Number);

/* --- la forma de la curva --- */
{
  const c = curvaResorte();
  const p = puntos(c);
  ok('es una función linear()', c.startsWith('linear(') && c.endsWith(')'));
  ok('arranca exactamente en 0', p[0] === 0, `(${p[0]})`);
  ok('termina exactamente en 1', p[p.length - 1] === 1, `(${p[p.length - 1]})`);
  ok('tiene las muestras pedidas', p.length === 40, `(${p.length})`);
  ok('ningún valor es NaN', p.every(Number.isFinite));
  /* Un resorte arranca rápido: a la cuarta parte del tiempo ya recorrió más
     de la cuarta parte del camino. Eso es lo que lo distingue de una recta, y
     si alguien cambia la simulación por una interpolación lineal, esto lo
     agarra. */
  ok('arranca más rápido que una recta', p[Math.floor(p.length / 4)] > 0.25 + 0.1,
     `(${p[Math.floor(p.length / 4)]})`);
}

/* --- amortiguación: cuánto rebota --- */
{
  const blando = puntos(curvaResorte({ amortiguacion: 8, muestras: 60 }));
  const duro = puntos(curvaResorte({ amortiguacion: 60, muestras: 60 }));
  ok('poco amortiguado se pasa de largo', Math.max(...blando) > 1.02, `(${Math.max(...blando)})`);
  ok('muy amortiguado no se pasa', Math.max(...duro) <= 1.0001, `(${Math.max(...duro)})`);
  /* Y el muy amortiguado no retrocede nunca: una tarjeta que vuelve para
     atrás en el medio del viaje se lee como un error, no como un rebote. */
  let sube = true;
  for (let i = 1; i < duro.length; i++) if (duro[i] < duro[i - 1] - 1e-6) sube = false;
  ok('y nunca retrocede', sube);
}

/* --- la duración acompaña a la rigidez --- */
{
  const lento = duracionResorte({ rigidez: 60 });
  const rapido = duracionResorte({ rigidez: 400 });
  ok('más rígido, más rápido', rapido < lento, `(${rapido} ms vs ${lento} ms)`);
  ok('y ninguno es absurdo', lento > 80 && lento < 5000 && rapido > 40, `(${rapido}, ${lento})`);
}

/* --- lo que no se acepta --- */
for (const [q, p] of [['masa cero', { masa: 0 }], ['rigidez negativa', { rigidez: -1 }],
                      ['una sola muestra', { muestras: 1 }]]) {
  let tiro = false;
  try { curvaResorte(p); } catch (e) { tiro = true; }
  ok(`${q} se rechaza`, tiro);
}

if (mal) { console.error(`\n${mal} caso(s) de resorte fallaron`); process.exit(1); }
console.log('14 casos de movimiento de resorte: todos pasan');
