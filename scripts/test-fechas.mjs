/* Casos tomados del relevamiento real del admin. Corre con: npm test */
import { parseFecha } from './fechas.mjs';

const casos = [
  // [entrada, ref, precision, texto]
  ['1966',            1966, 'anio',        '1966'],
  ['Año: 1966',       1966, 'anio',        '1966'],
  ['1960 aprox',      1960, 'circa',       'c. 1960'],
  ['1967 Aprox',      1967, 'circa',       'c. 1967'],
  ['aprox 1943',      1943, 'circa',       'c. 1943'],
  ['c.1920',          1920, 'circa',       'c. 1920'],
  ['1985/1986 Aprox', 1985, 'circa',       '1985–1986'],
  ['1985/1986',       1985, 'anio',        '1985–1986'],
  ['1985/86',         1985, 'anio',        '1985–1986'],
  ['1966-1968',       1966, 'anio',        '1966–1968'],
  ['1975 a 1977',     1975, 'anio',        '1975–1977'],
  ['07/10/2025',      2025, 'dia',         '07/10/2025'],
  ['2025-10-07',      2025, 'dia',         '07/10/2025'],
  ['dec. 1950',       1950, 'decada',      'déc. 1950'],
  ['década del 60',   1960, 'decada',      'déc. 1960'],
  ['años 60',         1960, 'decada',      'déc. 1960'],
  ['1950s',           1950, 'decada',      'déc. 1950'],
  ['pendiente',       null, 'desconocida', ''],
  ['Pendiente',       null, 'desconocida', ''],
  ['',                null, 'desconocida', ''],
  ['sin fecha',       null, 'desconocida', ''],
  ['el año del incendio', null, 'desconocida', 'el año del incendio'],
];

let fallos = 0;
for (const [entrada, ref, precision, texto] of casos) {
  const f = parseFecha(entrada);
  const ok = f.ref === ref && f.precision === precision && f.texto === texto;
  if (!ok) {
    fallos++;
    console.log(`FALLA  ${JSON.stringify(entrada)}`);
    console.log(`  esperado: ref=${ref} precision=${precision} texto=${JSON.stringify(texto)}`);
    console.log(`  obtenido: ref=${f.ref} precision=${f.precision} texto=${JSON.stringify(f.texto)}`);
  }
}
// el rango debe abarcar de verdad
const r = parseFecha('1960 aprox');
if (r.desde !== 1955 || r.hasta !== 1965) { fallos++; console.log('FALLA rango de circa:', r); }

console.log(fallos === 0
  ? `${casos.length + 1} casos de fecha: todos pasan`
  : `${fallos} caso(s) fallan`);
process.exit(fallos ? 1 : 0);
