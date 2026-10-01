import { readFileSync } from 'node:fs';
import { aNormalizado, aLatLon, mapaPara } from '../src/lib/proyeccion.js';
const { mapas } = JSON.parse(readFileSync(new URL('../public/mapa/mapa.json', import.meta.url)));
const ejido = mapas.find(m => m.nombre === 'ejido');
const casco = mapas.find(m => m.nombre === 'casco');

let fallos = 0;
const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA  ' + n); } };

/* puntos reales del relevamiento OSM */
const sitios = [
  ['Aristóbulo del Valle', -27.0992, -54.8935],
  ['Paraje Cerro Moreno',  -27.0128, -54.8375],
  ['Salto Encantado',      -27.0858, -54.8328],
  ['Paraje Tamanduá',      -27.1263, -54.7703],
];

for (const [nombre, lat, lon] of sitios) {
  const p = aNormalizado(lat, lon, ejido);
  ok(`${nombre} cae dentro del ejido`, p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  const v = aLatLon(p.x, p.y, ejido);
  const err = Math.max(Math.abs(v.lat - lat), Math.abs(v.lon - lon)) * 111000;
  ok(`${nombre} ida y vuelta con menos de 1 m de error (${err.toFixed(3)} m)`, err < 1);
}

/* el casco sólo contiene el pueblo */
ok('Aristóbulo entra en el casco', mapaPara(-27.0992, -54.8935, mapas).nombre === 'casco');
ok('Cerro Moreno cae en el ejido, no en el casco', mapaPara(-27.0128, -54.8375, mapas).nombre === 'ejido');
ok('un punto fuera de todo da null', mapaPara(-30, -60, mapas) === null);

/* las esquinas del viewBox son las esquinas del bbox */
const e = aNormalizado(ejido.bounds[2], ejido.bounds[1], ejido);
ok('esquina superior izquierda = 0,0', Math.abs(e.x) < 1e-9 && Math.abs(e.y) < 1e-9);

console.log(fallos === 0 ? '12 casos de proyección: todos pasan' : `${fallos} caso(s) fallan`);
process.exit(fallos ? 1 : 0);
