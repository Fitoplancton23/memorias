/* "Que nunca quede uno detrás del otro" es un invariante, no un ajuste
   visual: se cumple o no se cumple, y si se rompe no se nota mirando —se nota
   cuando un vecino no encuentra en el mapa el lugar que vino a buscar. */
import { separar, peorSolape, AIRE } from '../src/lib/separar.js';

let fallan = 0;
const caso = (nombre, cs, extra = () => null) => {
  const antes = cs.map(c => ({ ...c }));
  separar(cs);
  const s = peorSolape(cs);
  /* Una milésima de tolerancia: la relajación converge, no resuelve exacto. */
  if (s > .001) {
    fallan++;
    console.error(`  ✗ ${nombre}: quedan solapados ${s.toFixed(3)} px`);
    return;
  }
  const m = extra(cs, antes);
  if (m) { fallan++; console.error(`  ✗ ${nombre}: ${m}`); }
};

const c = (x, y, r = 9, peso = 1) => ({ x, y, r, peso });

/* lo que no hay que tocar */
caso('uno solo', [c(100, 100)]);
caso('dos bien separados', [c(0, 0), c(100, 0)], cs =>
  cs[0].x !== 0 || cs[1].x !== 100 ? 'movió marcadores que no se tocaban' : null);
caso('justo en el límite', [c(0, 0, 9), c(0, 20 + AIRE, 9)], cs =>
  cs[0].y !== 0 ? 'movió un par que ya tenía su aire' : null);

/* los casos reales */
caso('dos a dos píxeles', [c(0, 0), c(2, 0)]);
caso('dos exactamente encima', [c(50, 50), c(50, 50)]);
caso('tres exactamente encima', [c(0, 0), c(0, 0), c(0, 0)]);
caso('ocho en el mismo punto', Array.from({ length: 8 }, () => c(0, 0)));
caso('radios distintos', [c(0, 0, 22), c(3, 1, 9), c(-2, 4, 14)]);
caso('una fila apretada', Array.from({ length: 12 }, (_, i) => c(i * 3, 0)));
caso('una grilla apretada', Array.from({ length: 25 },
  (_, i) => c((i % 5) * 4, Math.floor(i / 5) * 4)));

/* el que tiene más memorias se mueve menos */
caso('el pesado cede menos', [c(0, 0, 9, 20), c(4, 0, 9, 1)], cs => {
  const pesado = Math.abs(cs[0].x - 0), liviano = Math.abs(cs[1].x - 4);
  return pesado >= liviano ? `el pesado se movió ${pesado.toFixed(1)} y el liviano ${liviano.toFixed(1)}` : null;
});

/* y no se va a la otra punta del mapa: el corrimiento tiene que ser chico,
   o la guía se vuelve ilegible y el marcador miente sobre dónde está */
caso('el corrimiento es mínimo', [c(0, 0), c(1, 0), c(-1, 1)], (cs, antes) => {
  const lejos = Math.max(...cs.map((v, i) => Math.hypot(v.x - antes[i].x, v.y - antes[i].y)));
  return lejos > 40 ? `alguno se corrió ${lejos.toFixed(1)} px` : null;
});

/* estable: la misma entrada da la misma salida, o el mapa tiembla al moverlo */
{
  const uno = separar(Array.from({ length: 10 }, (_, i) => c(i % 3, i % 2)));
  const dos = separar(Array.from({ length: 10 }, (_, i) => c(i % 3, i % 2)));
  const igual = uno.every((v, i) => v.x === dos[i].x && v.y === dos[i].y);
  if (!igual) { fallan++; console.error('  ✗ dos corridas con la misma entrada dan distinto'); }
}

/* cien configuraciones al azar, que es donde aparecen los casos que nadie
   se imagina */
let semilla = 7;
const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
let peorDeTodos = -Infinity;
for (let n = 0; n < 100; n++) {
  const cs = Array.from({ length: 3 + Math.floor(azar() * 18) },
    () => c(azar() * 60, azar() * 60, 6 + azar() * 18, 1 + Math.floor(azar() * 9)));
  separar(cs);
  peorDeTodos = Math.max(peorDeTodos, peorSolape(cs));
}
if (peorDeTodos > .001) {
  fallan++;
  console.error(`  ✗ al azar: el peor caso quedó solapado ${peorDeTodos.toFixed(3)} px`);
}

if (fallan) { console.error(`${fallan} caso(s) de separación fallan`); process.exit(1); }
console.log(`13 casos de separación + 100 al azar: todos pasan (peor solape ${peorDeTodos.toFixed(3)} px)`);
