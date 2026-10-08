/* Dejarle lugar a la familia sin barajar el contexto.
   -------------------------------------------------------------------------
   Cuando el foco cambia y el bloque de la familia cambia de forma —se abre una
   generación, entra una rama— puede quedar alguna memoria o algún lugar debajo
   del bloque. Eso hay que resolverlo, pero no volviendo a correr las fuerzas:
   medido, una simulación de 60 pasos movía 63 nodos y mandaba a uno 460 píxeles
   de viaje para resolver que tres estaban tapados. Lo que se ve no es "se
   acomodó", es "se barajó la pantalla", y arriba de eso las conexiones nuevas
   parecen entrar deslizándose desde afuera.

   Acá se mueve sólo lo que está tapado, y sólo lo necesario para destaparlo:
   sale por el borde más cercano, en vertical, que es la misma dirección que
   usaba la fuerza de banda. Todo lo demás se queda exactamente donde estaba.
   Es la misma idea que separar() en el mapa: el mínimo corrimiento posible, y
   ninguno más.                                                               */

export const MARGEN = 86;

/* caja: { x0, x1, y0, y1 } del bloque de la familia.
   nodos: los que se pueden mover (los de la grilla están fijos y no entran).
   Devuelve cuántos se corrieron. */
export function despejar(caja, nodos, margen = MARGEN) {
  if (!caja) return 0;
  const x0 = caja.x0 - margen, x1 = caja.x1 + margen;
  const y0 = caja.y0 - margen, y1 = caja.y1 + margen;
  let movidos = 0;
  for (const n of nodos) {
    if (n.fijo) continue;
    if (n.x == null || n.y == null) continue;
    if (n.x <= x0 || n.x >= x1 || n.y <= y0 || n.y >= y1) continue;
    /* Por arriba o por abajo, lo que quede más cerca: el corrimiento más
       corto es el que menos se nota y el que menos miente sobre dónde estaba. */
    n.y = (n.y - y0) < (y1 - n.y) ? y0 : y1;
    movidos++;
  }
  return movidos;
}

/* ¿Quedó alguno tapado? Es el invariante, y se verifica, no se confía. */
export function tapados(caja, nodos, margen = MARGEN) {
  if (!caja) return [];
  const x0 = caja.x0 - margen, x1 = caja.x1 + margen;
  const y0 = caja.y0 - margen, y1 = caja.y1 + margen;
  return nodos.filter(n => !n.fijo && n.x != null && n.y != null
    && n.x > x0 && n.x < x1 && n.y > y0 && n.y < y1);
}
