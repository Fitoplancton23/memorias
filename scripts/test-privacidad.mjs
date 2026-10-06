/* La regla de privacidad es la única del sistema cuyo error no se ve:
   si se rompe, el sitio publica datos de gente viva y nadie se entera
   hasta que alguien del pueblo lo nota. Va cubierta. */
import { pareceViva, conPermiso } from './leer-supabase.mjs';

const ANIO = new Date().getFullYear();
let fallan = 0;
const caso = (nombre, persona, esperado) => {
  const dio = pareceViva(persona);
  if (dio !== esperado) { fallan++; console.error(`  ✗ ${nombre}: esperaba ${esperado}, dio ${dio}`); }
};

/* decisión explícita: manda siempre */
caso('marcada viva', { vive: true, fallecimiento_anio: 1960, nacimiento_anio: 1880 }, true);
caso('fallecimiento verificado', { vive: false, nacimiento_anio: ANIO - 20 }, false);

/* sin dato: presunción de los 100 años */
caso('sin saber, nació hace 120 años', { vive: null, nacimiento_anio: ANIO - 120 }, false);
caso('sin saber, nació hace 60 años', { vive: null, nacimiento_anio: ANIO - 60 }, true);
caso('sin saber, nació hace 100 años justos', { vive: null, nacimiento_anio: ANIO - 100 }, false);
caso('sin saber, nació hace 99 años', { vive: null, nacimiento_anio: ANIO - 99 }, true);

/* el caso que motivó todo: no saber no es saber que no */
caso('sin año de nacimiento y sin saber', { vive: null }, true);
caso('sin año de nacimiento, undefined', {}, true);

/* con año de fallecimiento cargado, aunque falte el de nacimiento */
caso('falleció en 1975, sin nacimiento', { vive: null, fallecimiento_anio: 1975 }, false);

/* ------------------------------------------------------------------ */
/* El permiso de quien aportó la memoria                               */
/* ------------------------------------------------------------------ */
/* El otro error que no se ve: una foto de una familia real publicada sin
   que nadie se lo haya preguntado. Mismo riesgo que `vive` y misma forma —
   tres estados, y el tercero importa. */
const memoria = (nombre, m, esperado) => {
  const dio = conPermiso(m);
  if (dio !== esperado) { fallan++; console.error(`  ✗ ${nombre}: esperaba ${esperado}, dio ${dio}`); }
};

memoria('autorizada', { permiso_publicacion: true }, true);
memoria('todavía no se preguntó', { permiso_publicacion: null }, false);
memoria('pidió que no se publique', { permiso_publicacion: false }, false);

/* la demo es inventada: no hay a quién preguntarle, y la cinta de aviso del
   sitio es lo que la cubre */
memoria('demo sin permiso', { es_demo: true, permiso_publicacion: null }, true);
memoria('demo con permiso negado', { es_demo: true, permiso_publicacion: false }, true);

/* la columna todavía no existe: no frena nada, o el sitio entero se apaga
   por una migración que falta */
memoria('sin la columna', {}, true);
memoria('sin la columna, con es_demo false', { es_demo: false }, true);

/* y lo que no tiene que confundirse con un sí */
memoria('cadena vacía no es un sí', { permiso_publicacion: '' }, false);
memoria('la cadena "false" no es un sí', { permiso_publicacion: 'false' }, false);

if (fallan) { console.error(`${fallan} caso(s) de privacidad fallan`); process.exit(1); }
console.log('18 casos de privacidad: todos pasan');
