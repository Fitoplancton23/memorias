/* Cómo se busca a una persona en el archivo.
   -------------------------------------------------------------------------
   En el pueblo la gente no se busca por el nombre del documento. Se busca por
   el apodo —"el Negro", "la Tana"— y se escribe sin acentos, de apuro, desde
   el celular. Un buscador que sólo mira `nombre` y exige la tilde es un
   buscador que no encuentra a nadie, y lo peor es que no lo dice: devuelve
   vacío, que se lee como "esta persona no está en el archivo".

   Por eso esto vive acá y con tests: no es una comodidad, es la diferencia
   entre que alguien encuentre a su bisabuelo o se vaya creyendo que no está. */

/* Sin tildes y en minúscula. Para comparar, nunca para mostrar: el nombre se
   escribe como la familia lo escribe.

   La ñ también se pliega, a propósito. En castellano no es una n con tilde
   sino otra letra, pero acá no se está escribiendo: se está buscando, y
   alguien que tipea "Munoz" desde un teclado que no tiene ñ tiene que
   encontrar a Muñoz. El costo es que "Peña" y "Pena" se mezclan en los
   resultados, y eso se resuelve solo: el resultado muestra el nombre
   verdadero. */
export const plano = s => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* Los otros nombres de una persona, como los guarda el snapshot: el apodo y
   los alias vienen en un solo campo separados por punto y coma. */
export const otrosNombres = p => (p.apodo || '')
  .split(';').map(s => s.trim()).filter(Boolean);

/* ¿Esta persona calza con lo que se escribió?
   -------------------------------------------------------------------------
   Todas las palabras tienen que aparecer, pero pueden repartirse entre el
   nombre y los apodos: "negro silveira" encuentra a Roberto Silveira, alias
   el Negro, que es exactamente como alguien lo nombraría en voz alta.

   Devuelve null si no calza, y si calza devuelve por cuál apodo —cuando fue
   un apodo el que aportó algo que el nombre no tenía—. Eso no es un adorno:
   si alguien busca "el Negro" y le aparece "Roberto Silveira", sin esa línea
   no tiene forma de saber si el archivo entendió lo que preguntó.          */
export function calza(consulta, persona) {
  const partes = plano(consulta).trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return null;

  const nombre = persona.nombre || '';
  const otros = persona.otros || otrosNombres(persona);
  const unNombre = plano(nombre);
  const todo = plano([nombre, ...otros].join(' '));

  if (!partes.every(w => todo.includes(w))) return null;

  /* Cuál apodo explica el hallazgo: el primero que aporta una palabra que el
     nombre solo no tiene. Si el nombre ya alcanzaba, no hay nada que explicar. */
  const por = otros.find(o =>
    partes.some(w => !unNombre.includes(w) && plano(o).includes(w)));
  return { por: por || null };
}
