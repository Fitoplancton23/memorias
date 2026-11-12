/* Movimiento de resorte, para animaciones del navegador.
   ==========================================================================
   Una curva `cubic-bezier` fija describe un movimiento que acelera y frena,
   y está bien para lo que aparece o se apaga. Para algo que SE MUEVE de un
   lugar a otro —ocho tarjetas reacomodándose— un resorte se lee distinto:
   arranca con ganas, llega y se asienta, en vez de frenar de golpe en el
   último cuadro. Es la diferencia entre algo que se desplaza y algo que se
   acomoda.

   La idea viene de Remotion, que anima con resortes en vez de curvas. Acá no
   hay React ni cuadros: hay una animación del navegador, así que el resorte
   se simula una vez, se lo convierte en una función `linear()` con sus
   muestras y el navegador interpola entre ellas. Son unos cientos de bytes y
   no corre nada en cada cuadro.

   Sin `linear()` —navegadores viejos— quien llama usa su curva de reserva:
   el movimiento es el mismo, un poco menos vivo. */

/** ¿Este navegador entiende `linear()` con muchas muestras? */
export const hayLinear = () =>
  typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)');

/**
 * Simula un resorte y devuelve `linear(…)`.
 * @param masa          cuánto cuesta moverlo
 * @param rigidez       cuánto tira hacia el final
 * @param amortiguacion cuánto frena; alta = llega y se queda, baja = rebota
 * @param muestras      cuántos puntos tiene la curva
 */
export function curvaResorte({ masa = 1, rigidez = 170, amortiguacion = 26, muestras = 40 } = {}) {
  if (masa <= 0 || rigidez <= 0 || amortiguacion < 0 || muestras < 2)
    throw new Error('un resorte necesita masa y rigidez positivas, y al menos dos muestras');

  const paso = 1 / 60;             /* se simula a 60 por segundo */
  const valores = [];
  let x = 0, v = 0;

  /* Cuántos segundos dura: se simula hasta que se queda quieto, con un techo
     para que un resorte mal puesto no cuelgue el navegador. */
  const estados = [];
  for (let t = 0; t < 60 / 1; t += paso) {
    const fuerza = rigidez * (1 - x) - amortiguacion * v;
    v += (fuerza / masa) * paso;
    x += v * paso;
    estados.push(x);
    if (Math.abs(1 - x) < 0.001 && Math.abs(v) < 0.001) break;
  }
  if (!estados.length) estados.push(1);

  for (let i = 0; i < muestras; i++) {
    const cual = Math.round((i / (muestras - 1)) * (estados.length - 1));
    valores.push(+estados[cual].toFixed(4));
  }
  /* Los dos extremos, clavados. La simulación corta cuando está a menos de
     una milésima del final, así que sin esto la curva terminaría en 0,9995:
     invisible, pero deja la tarjeta medio píxel corrida para siempre. Había
     además una segunda línea haciendo lo mismo sobre la simulación, y entre
     las dos ninguna quedaba cubierta por un test — sacar cualquiera de las
     dos seguía pasando. Queda una. */
  valores[0] = 0;
  valores[valores.length - 1] = 1;
  return `linear(${valores.join(', ')})`;
}

/** Cuánto dura, en milisegundos, ese mismo resorte. */
export function duracionResorte({ masa = 1, rigidez = 170, amortiguacion = 26 } = {}) {
  const paso = 1 / 60;
  let x = 0, v = 0, t = 0;
  for (; t < 60; t += paso) {
    const fuerza = rigidez * (1 - x) - amortiguacion * v;
    v += (fuerza / masa) * paso;
    x += v * paso;
    if (Math.abs(1 - x) < 0.001 && Math.abs(v) < 0.001) break;
  }
  return Math.round(t * 1000);
}
