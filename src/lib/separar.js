/* Que ningún marcador quede detrás de otro.
   -------------------------------------------------------------------------
   Dos lugares separados por quince metros caen en el mismo píxel cuando el
   mapa está alejado, y el que se dibuja después tapa al otro: un lugar que
   existe deja de verse, y nada en pantalla lo dice.

   Esto no toca la coordenada del lugar —ésa se fija una vez y no se recalcula
   nunca, que es la Regla 4—: corre el dibujo, lo mínimo necesario, y sólo
   mientras esa escala lo pida. Quien dibuja se encarga de la otra mitad: donde
   el corrimiento se nota, una línea fina va del punto verdadero al marcador.
   Eso es lo que lo mantiene honesto. El mapa no finge que el lugar está ahí:
   dice "lo corrí para que se vea, y en realidad está acá".

   El que tiene más memorias se mueve menos. Es el marcador más grande y el más
   buscado, y que ceda el chico hace que el movimiento se lea como una
   consecuencia del apretujamiento y no como un temblor.                      */

export const AIRE = 2;          /* px de separación entre dos marcadores */
export const GUIA_DESDE = 3.5;  /* px de corrimiento a partir del cual va la guía */

const ORO = 2.39996323;         /* el ángulo de oro, en radianes */

/* Recibe y modifica en el lugar: { x, y, r, peso }. Devuelve el mismo arreglo.
   `vueltas` acota el trabajo — sin tope, una configuración imposible de
   resolver dejaría el mapa trabado en un cuadro. */
export function separar(cs, vueltas = 60) {
  for (let v = 0; v < vueltas; v++) {
    let movio = false;
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i], b = cs[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const min = a.r + b.r + AIRE;
        if (d >= min) continue;
        if (d < 1e-6) {
          /* Exactamente encima. La dirección sale del índice: siempre la misma
             para el mismo par —así no tiembla al mover el mapa— y bien
             repartida cuando son varios en el mismo punto. */
          const ang = i * ORO;
          dx = Math.cos(ang); dy = Math.sin(ang); d = 1;
        }
        const empuje = (min - d) / d;
        /* Cada uno cede en proporción inversa a su peso. */
        const total = (a.peso || 1) + (b.peso || 1);
        const ca = (b.peso || 1) / total, cb = (a.peso || 1) / total;
        a.x -= dx * empuje * ca; a.y -= dy * empuje * ca;
        b.x += dx * empuje * cb; b.y += dy * empuje * cb;
        movio = true;
      }
    }
    if (!movio) break;          /* el caso normal: nada se solapa, una pasada */
  }
  return cs;
}

/* Cuánto se solapan los dos que peor están. Negativo es que no se tocan.
   Vive acá y no en los tests porque es la definición de la regla. */
export function peorSolape(cs) {
  let peor = -Infinity;
  for (let i = 0; i < cs.length; i++)
    for (let j = i + 1; j < cs.length; j++) {
      const s = cs[i].r + cs[j].r - Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y);
      if (s > peor) peor = s;
    }
  return cs.length < 2 ? -Infinity : peor;
}
