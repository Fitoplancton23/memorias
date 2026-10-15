/* Las notas que los administradores se dejan en una memoria.
   -------------------------------------------------------------------------
   El archivo lo curan dos personas que casi nunca están al mismo tiempo. Lo
   que se pierde entre una revisión y la otra es lo que uno sabe y el otro no:
   "a ésta le faltan las fotos, buscar en el grupo", "ya le pregunté a la
   familia", "ojo que es la misma que la 47". Sin un lugar para eso, cada
   revisión empieza de cero.

   Acá vive sólo lo que se puede probar sin pantalla: cómo se firma y cómo se
   dice cuándo. */

/* Cuándo, dicho como lo diría una persona.
   -------------------------------------------------------------------------
   "hoy" y "ayer" en vez de la fecha, porque en una nota de trabajo lo que
   importa es si es de recién o de la semana pasada, y "15 oct" obliga a
   calcular. De ahí para atrás sí la fecha: a los cuatro días "hace 4 días" ya
   no ubica a nadie. */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
               'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function cuando(fecha, ahora = new Date()) {
  /* `new Date(null)` no da una fecha inválida: da el 1 de enero de 1970. Sin
     este guardia, una nota sin fecha salía fechada en 1969. */
  if (fecha == null || fecha === '') return '';
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d)) return '';
  /* Por día del calendario y no por horas cumplidas: algo de anoche a las
     23:50 es "ayer" aunque hayan pasado seis horas, que es como lo diría
     cualquiera. */
  const dia = x => Math.floor((x - x.getTimezoneOffset() * 60000) / 86400000);
  const dif = dia(ahora) - dia(d);
  if (dif <= 0) return 'hoy';
  if (dif === 1) return 'ayer';
  const mismoAnio = d.getFullYear() === ahora.getFullYear();
  return `${d.getDate()} ${MESES[d.getMonth()]}` + (mismoAnio ? '' : ` ${d.getFullYear()}`);
}

/* Quién la dejó. El nombre viaja copiado en la nota porque cada administrador
   sólo puede ver su propia fila de `administradores`: sin eso, la nota del
   otro diría "alguien". Si igual falta, se dice que falta en vez de inventar
   un nombre. */
export const firma = nota => (nota?.autor || '').trim() || 'Un administrador';

/* Lo que se ve arriba de cada nota. */
export const encabezado = (nota, ahora) =>
  [firma(nota), cuando(nota?.creada_en, ahora)].filter(Boolean).join(' · ');

/* Qué dice el botón del teléfono, donde las notas están plegadas. Tiene que
   decir cuántas hay SIN abrirlas: si dijera sólo "Notas", habría que tocar
   cada memoria de la lista para saber si alguien dejó algo. */
export function rotuloBoton(n) {
  if (!n) return 'Dejar una nota';
  return n === 1 ? '1 nota' : `${n} notas`;
}
