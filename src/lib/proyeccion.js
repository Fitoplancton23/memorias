/* Convierte entre coordenadas reales y las del mapa ilustrado.
   Funciona porque las bases salieron de OpenStreetMap con una proyección y unos
   límites fijos y anotados en public/mapa/mapa.json. Mientras el dibujo de
   Illustrator se haga ENCIMA de esa base sin mover ni escalar el lienzo, cada
   marcador colocado a mano tiene también su latitud y longitud verdaderas.     */

const R = 20037508.34;
const mercX = lon => lon * R / 180;
const mercY = lat => Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * R / 180;
const mercYinv = y => Math.atan(Math.exp(y / (R / 180) * (Math.PI / 180))) * 360 / Math.PI - 90;

/** lat/lon -> {x, y} normalizados 0-1 sobre el viewBox del mapa */
export function aNormalizado(lat, lon, mapa) {
  const [minlat, minlon, maxlat, maxlon] = mapa.bounds;
  const x0 = mercX(minlon), x1 = mercX(maxlon);
  const y0 = mercY(minlat), y1 = mercY(maxlat);
  return { x: (mercX(lon) - x0) / (x1 - x0), y: (y1 - mercY(lat)) / (y1 - y0) };
}

/** {x, y} normalizados -> lat/lon reales */
export function aLatLon(x, y, mapa) {
  const [minlat, minlon, maxlat, maxlon] = mapa.bounds;
  const x0 = mercX(minlon), x1 = mercX(maxlon);
  const y0 = mercY(minlat), y1 = mercY(maxlat);
  return { lat: mercYinv(y1 - y * (y1 - y0)), lon: (x0 + x * (x1 - x0)) * 180 / R };
}

/** ¿cae este punto dentro del mapa? */
export const caeDentro = (lat, lon, mapa) =>
  lat >= mapa.bounds[0] && lat <= mapa.bounds[2] && lon >= mapa.bounds[1] && lon <= mapa.bounds[3];

/** el mapa más chico que contiene el punto: el casco si entra, si no el ejido */
export const mapaPara = (lat, lon, mapas) =>
  mapas.find(m => m.nombre === 'casco' && caeDentro(lat, lon, m)) ||
  mapas.find(m => caeDentro(lat, lon, m)) || null;
