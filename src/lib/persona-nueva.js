/* Cómo se da de alta a una persona.
   -------------------------------------------------------------------------
   Tres datos, los tres opcionales: nombre, apellido y apodo. En el pueblo
   pasan las tres faltas por separado. "Alumnos: Potschka y Prevelis" — sólo
   el apellido. "doña Goya" — sólo el nombre. Y el caso que faltaba: "el
   Negro de la panadería", que es alguien a quien nadie nombró nunca de otra
   manera y que hasta ahora no se podía cargar.

   Pero los tres vacíos no es una persona incompleta: es una fila sin sentido.
   No se puede nombrar, no se puede buscar, no se puede mostrar. Esa es la
   única regla, y vive también en la base como restricción, porque el panel no
   es la única puerta.                                                        */

const limpio = s => (s || '').trim();

/* Partir un nombre escrito de un tirón. Es una heurística, no una verdad: se
   parte por la última palabra, que acierta casi siempre —"Juan Potkova"— y se
   equivoca con los compuestos —"Ana María De Souza"—. Por eso lo que sale de
   acá se muestra en tres campos editables y no se guarda a ciegas, que es lo
   que se hacía antes: el panel partía solo y el error se descubría después,
   en la ficha, si alguien lo miraba. */
export function partir(texto) {
  const t = limpio(texto);
  if (!t) return { nombre: '', apellido: '', apodo: '' };
  const partes = t.split(/\s+/);
  const apellido = partes.length > 1 ? partes.pop() : '';
  return { nombre: partes.join(' '), apellido, apodo: '' };
}

/* ¿Alcanza para dar de alta? Uno de los tres, el que sea. */
export const sirve = p =>
  !!(limpio(p?.nombre) || limpio(p?.apellido) || limpio(p?.apodo));

/* Cómo se la nombra en pantalla. Con nombre o apellido, eso; si lo único que
   hay es el apodo, el apodo — y sin comillas ni adornos, porque en el pueblo
   «el Negro» es su nombre, no un apodo entre paréntesis de un nombre que
   nadie usa. */
export function comoSeLlama(p) {
  const propio = [limpio(p?.nombre), limpio(p?.apellido)].filter(Boolean).join(' ');
  return propio || limpio(p?.apodo) || '';
}

/* Lo que se convierte en dirección pública. Sale de lo mismo que se muestra,
   así que /personas/el-negro/ para quien sólo tiene apodo. Nunca cambia
   después: es la dirección que alguien pudo mandar por WhatsApp. */
export const baseSlug = p => comoSeLlama(p);

/* La fila, lista para insertar. Los vacíos van como NULL y no como cadena
   vacía: '' afirma que el apellido es la cadena vacía, y NULL dice lo que de
   verdad pasa, que no se sabe. Es la misma razón por la que `linaje_id` es
   nulo — el sistema sabe qué le falta. */
export function fila(p) {
  if (!sirve(p)) return null;
  const o = s => limpio(s) || null;
  return { nombre: o(p.nombre), apellido: o(p.apellido), apodo: o(p.apodo) };
}
