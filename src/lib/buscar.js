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

/* ------------------------------------------------------------------------ */
/* Cómo se busca una MEMORIA                                                 */
/* ------------------------------------------------------------------------ */
/* Buscar una persona y buscar una memoria no son lo mismo. A una persona se
   la busca por su nombre; a una memoria se la busca por cualquier hilo del
   que alguien se acuerde: "el baile del club", "la escuela", "mi abuelo",
   "1948". Nadie recuerda el título que le puso el que la cargó.

   Por eso todas las palabras pueden repartirse entre todos los campos:
   "escuela 1948" encuentra la foto de la escuela de ese año aunque el título
   no diga ninguna de las dos cosas. Y por eso busca también por apodo, que es
   como se nombra a la gente acá.

   El año entra como texto y no como número: quien escribe "1948" está
   escribiendo una palabra más, y "194" no tiene que encontrar los años
   cuarenta — eso sería adivinar. La década se busca con el filtro, que para
   eso está. */

/* Todo lo que una memoria ofrece para ser encontrada, cada cosa con su
   etiqueta, para después poder decir por dónde se la encontró. */
function hilos(m) {
  const h = [];
  if (m.titulo) h.push({ que: 'titulo', texto: m.titulo, nombre: m.titulo });
  for (const p of m.gente || []) {
    h.push({ que: 'persona', texto: p.nombre, nombre: p.nombre });
    for (const o of p.otros || otrosNombres(p))
      h.push({ que: 'apodo', texto: o, nombre: `${p.nombre} (${o})` });
  }
  for (const l of m.lugares || []) h.push({ que: 'lugar', texto: l, nombre: l });
  for (const a of m.hechos || []) h.push({ que: 'hecho', texto: a, nombre: a });
  if (m.anio) h.push({ que: 'anio', texto: String(m.anio), nombre: String(m.anio) });
  /* El relato no se muestra entero —puede ser un párrafo del que una palabra
     calzó— pero sí se dice que fue ahí. Devolver `null` dejaba un resultado
     sin explicación, que es justo lo que este archivo no puede permitirse: lo
     encontró el buscador y nadie sabe por qué. */
  if (m.texto) h.push({ que: 'relato', texto: m.texto, nombre: 'el relato' });
  return h;
}

/* ¿Esta memoria calza con lo que se escribió?
   Devuelve null si no, y si sí devuelve por dónde se la encontró — cuando fue
   algo distinto del título lo que aportó una palabra que el título no tenía.
   Un resultado que no se puede explicar es un resultado en el que no se puede
   confiar: si alguien busca "el Negro" y le aparece "Baile del club", sin esa
   línea no sabe si el archivo entendió lo que preguntó. */
export function calzaMemoria(consulta, m) {
  const partes = plano(consulta).trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return null;

  const hs = hilos(m);
  const todo = plano(hs.map(h => h.texto).join(' '));
  if (!partes.every(w => todo.includes(w))) return null;

  /* Qué hilo explica el hallazgo. Se prefiere en este orden —persona, apodo,
     lugar, acontecimiento, año— porque es el orden en que la gente nombra lo
     que busca, y porque el relato es el menos útil de mostrar: puede ser un
     párrafo entero del que una palabra calzó de casualidad. */
  const orden = ['persona', 'apodo', 'lugar', 'hecho', 'anio', 'relato'];
  const delTitulo = plano(m.titulo || '');
  const faltan = partes.filter(w => !delTitulo.includes(w));
  if (!faltan.length) return { por: null, que: 'titulo' };

  /* Gana el hilo que explica MÁS de lo que se escribió, y el orden de arriba
     sólo desempata. Alcanzar con una palabra daba explicaciones falsas con
     datos de verdad: quien escribía "María Ejemplo" leía "por Juan Ejemplo",
     porque ese nombre también contiene "Ejemplo" y venía primero. Un pueblo
     comparte apellidos — ese empate es la regla, no la excepción. */
  let mejor = null;
  for (const h of hs) {
    const rango = orden.indexOf(h.que);
    if (rango < 0) continue;                 /* el título no se explica a sí mismo */
    const texto = plano(h.texto);
    const cubre = faltan.filter(w => texto.includes(w)).length;
    if (!cubre) continue;
    if (!mejor || cubre > mejor.cubre || (cubre === mejor.cubre && rango < mejor.rango))
      mejor = { h, cubre, rango };
  }
  return mejor ? { por: mejor.h.nombre, que: mejor.h.que } : { por: null, que: 'titulo' };
}

/* La lista, en el orden en que entró. Ordenar por "relevancia" pediría una
   puntuación inventada; acá el orden lo pone quien llama —la línea de tiempo
   por año, el mapa por lugar— y eso es más honesto que un número. */
export function buscarMemorias(consulta, memorias) {
  const r = [];
  for (const m of memorias) {
    const c = calzaMemoria(consulta, m);
    if (c) r.push({ ...m, ...c });
  }
  return r;
}

/* Cómo se le dice a alguien por dónde se encontró la memoria.
   -------------------------------------------------------------------------
   Vive acá y no en cada vista porque es una sola frase para todo el sitio: si
   el mapa dice "apodo: el Negro" y la línea de tiempo dice "coincide con el
   alias", hay que aprender dos veces lo mismo. Y se escribe como lo diría una
   persona —"por el apodo el Negro"—, no con el nombre del campo.

   Devuelve '' cuando no hay nada que explicar: el título ya contenía todo lo
   que se escribió, y agregar "por el título" sería ruido debajo del título. */
export function comoSeEncontro(c) {
  if (!c || !c.por) return '';
  switch (c.que) {
    case 'apodo':  return `por el apodo ${c.por}`;
    case 'lugar':  return `por el lugar ${c.por}`;
    case 'anio':   return `por el año ${c.por}`;
    case 'relato': return 'por algo que dice el relato';
    default:       return `por ${c.por}`;   /* la persona y el acontecimiento se nombran solos */
  }
}
