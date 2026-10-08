/* Dónde van las memorias de la persona en foco.
   -------------------------------------------------------------------------
   Antes tenían una posición propia en el lienzo, calculada una vez con
   fuerzas. Era defendible —una memoria es una entidad, no decoración— pero en
   pantalla daba esto: la memoria de 1957 de la persona que estás mirando podía
   quedar en la otra punta, y su curva cruzaba el dibujo entero. Con ocho
   memorias eran ocho líneas atravesando todo.

   Acá las memorias del foco se acomodan en una banda por encima de su familia,
   en orden cronológico: las más viejas a la izquierda, las recientes a la
   derecha, con un arqueo suave para que se lea como una línea de tiempo y no
   como un renglón. La banda tiene el ancho del bloque familiar, así que no
   obliga a alejar la cámara, y ninguna curva mide más que medio bloque.

   Las dos reglas que la sostienen:

   **El lugar sale del año, no del orden.** Se reparte sobre el rango de años
   de todo el archivo, que no cambia nunca. Así una memoria no se corre porque
   aparezca o desaparezca otra, y entre dos hermanos —que comparten el bloque—
   la banda queda idéntica.

   **Las que no tienen fecha no entran.** Ahí la posición afirmaría un año que
   el archivo no sabe. Van abajo, en su propio renglón, que es un lugar
   distinto para un estado distinto.                                          */

export const ARCO = {
  ALTO: 120,        /* cuánto por encima del bloque empieza la banda */
  ARQUEO: 48,       /* cuánto se arquea en el medio: línea de tiempo, no renglón */
  FILA: 44,         /* cuánto sube una memoria que no entra donde le toca */
  ALTO_PASTILLA: 34,
  PASO: 120,        /* cuánto más afuera va el lugar donde ocurrió */
  ABAJO: 140,       /* el renglón de las que no tienen fecha */
  SEPARACION: 150,
  ANCHO_MIN: 520,   /* una familia de una sola persona igual necesita banda */
  /* La banda va algo más angosta que la familia: así sus puntas quedan dentro
     del bloque y no se meten debajo de la ficha, que ocupa la derecha. */
  ANCHO_FACTOR: .82,
};

/* caja:  { x0, x1, y0, y1 } del bloque familiar
   cosas: [{ id, anio }]
   rango: { min, max } los años del archivo                                   */
export function arco(caja, cosas, rango, o = {}) {
  const { ALTO, ARQUEO, FILA, ABAJO, SEPARACION, ANCHO_MIN, ANCHO_FACTOR } = { ...ARCO, ...o };
  const sitio = new Map();
  if (!caja || !cosas?.length) return sitio;

  const cx = (caja.x0 + caja.x1) / 2;
  const ancho = Math.max((caja.x1 - caja.x0) * ANCHO_FACTOR, ANCHO_MIN);
  const min = rango?.min, max = rango?.max;
  const span = (max ?? 0) - (min ?? 0);

  for (const c of cosas.filter(x => x.anio != null)) {
    const t = span > 0 ? Math.min(1, Math.max(0, (c.anio - min) / span)) : .5;
    const k = 2 * t - 1;                      /* -1 izquierda, +1 derecha */
    sitio.set(c.id, {
      x: cx + k * ancho / 2,
      /* El arqueo es máximo en el medio y nulo en las puntas. */
      y: caja.y0 - ALTO - ARQUEO * (1 - k * k),
    });
  }

  const sin = cosas.filter(x => x.anio == null);
  const y = caja.y1 + ABAJO;
  sin.forEach((c, i) => {
    sitio.set(c.id, { x: cx + (i - (sin.length - 1) / 2) * SEPARACION, y });
  });
  return sitio;
}

/* El lugar o el acontecimiento donde ocurrió una memoria cuelga de ella, no de
   la familia: va un paso más afuera, alejándose del bloque. */
export function masAfuera(caja, punto, paso = ARCO.PASO) {
  if (!caja || !punto) return punto;
  const cy = (caja.y0 + caja.y1) / 2;
  const arriba = punto.y < cy;
  return { x: punto.x, y: punto.y + (arriba ? -paso : paso) };
}

/* El invariante: nada del contexto queda encima del bloque de la familia. */
export function dentro(caja, puntos) {
  return [...puntos.values()].filter(p =>
    p.x > caja.x0 && p.x < caja.x1 && p.y > caja.y0 && p.y < caja.y1);
}

/* Apilar lo que no entra en un renglón.
   -------------------------------------------------------------------------
   Desde que una memoria es una pastilla con su foto y su título, ocupa unos
   doscientos píxeles de ancho en vez de un punto. Dos memorias de años
   cercanos caen en columnas cercanas y las pastillas se tapan — que es el
   mismo problema de los marcadores del mapa, acá otra vez.

   Se las sube de renglón: se recorren de izquierda a derecha y cada una busca
   el renglón más bajo donde no pise a ninguna ya puesta. La X no se toca
   nunca, porque la X es el año y moverla sería mentir sobre cuándo fue.

   Lo que esto cuesta, dicho: el renglón sí depende de qué otras memorias estén
   a la vista, así que al pasar de una persona a otra de la misma familia una
   pastilla puede subir o bajar un renglón. Son 44 píxeles y no se anima —el
   contexto nunca viaja, se funde—, y a cambio ninguna pastilla queda debajo de
   otra, que es lo que de verdad rompe la lectura.                            */
export function apilar(sitio, anchos, o = {}) {
  const { FILA, ALTO_PASTILLA } = { ...ARCO, ...o };
  const AIRE_X = 14, AIRE_Y = 6;
  const puestas = [];
  const porX = [...sitio.entries()]
    .filter(([id]) => anchos.get(id))
    .sort((a, b) => a[1].x - b[1].x || String(a[0]).localeCompare(String(b[0])));
  let subidas = 0;
  for (const [id, p] of porX) {
    const w = anchos.get(id);
    let y = p.y, vueltas = 0;
    /* Contra la geometría real y no contra renglones fijos: la banda está
       arqueada, así que dos pastillas "del mismo renglón" no están a la misma
       altura, y el primer intento —subir de a un renglón y comparar renglones—
       dejaba pares encimados. Lo encontró el test con 300 configuraciones al
       azar: 182 fallaban. */
    while (vueltas++ < 40 && puestas.some(q =>
      Math.abs(p.x - q.x) < (w + q.w) / 2 + AIRE_X &&
      Math.abs(y - q.y) < ALTO_PASTILLA + AIRE_Y)) {
      y -= FILA;
    }
    if (y !== p.y) { sitio.set(id, { x: p.x, y }); subidas++; }
    puestas.push({ x: p.x, y, w });
  }
  return subidas;
}

/* ¿Quedó alguna pastilla encima de otra? El invariante del apilado. */
export function encimadas(sitio, anchos, alto = ARCO.ALTO_PASTILLA) {
  const xs = [...sitio.entries()].filter(([id]) => anchos.get(id));
  const choques = [];
  for (let i = 0; i < xs.length; i++)
    for (let j = i + 1; j < xs.length; j++) {
      const [ia, pa] = xs[i], [ib, pb] = xs[j];
      const wa = anchos.get(ia) / 2, wb = anchos.get(ib) / 2;
      if (Math.abs(pa.x - pb.x) < wa + wb && Math.abs(pa.y - pb.y) < alto)
        choques.push([ia, ib]);
    }
  return choques;
}
