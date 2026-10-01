/* La regla de privacidad es la única del sistema cuyo error no se ve:
   si se rompe, el sitio publica datos de gente viva y nadie se entera
   hasta que alguien del pueblo lo nota. Va cubierta. */
import { pareceViva } from './leer-supabase.mjs';

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

if (fallan) { console.error(`${fallan} caso(s) de privacidad fallan`); process.exit(1); }
console.log('9 casos de privacidad: todos pasan');
