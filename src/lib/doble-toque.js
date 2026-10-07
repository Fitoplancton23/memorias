/* Doble toque para acercar.
   -------------------------------------------------------------------------
   En un mapa, el doble toque acerca. No hay nada que enseñar: es lo que la
   gente ya hace, en el mapa del teléfono y en el de la calle.

   El navegador sintetiza un `dblclick` a partir de dos toques, y en el
   escritorio eso alcanza. En el teléfono no se puede confiar: estos mapas
   declaran `touch-action: none` —hace falta para que el pellizco sea nuestro
   y no del navegador— y con eso iOS deja de emitir `dblclick` de forma
   predecible. Así que el doble toque se escucha a mano.

   Dos condiciones, y las dos importan. El tiempo, para que dos toques
   separados no se confundan con uno doble. Y la distancia: dos toques en
   puntos distintos son dos toques, aunque vengan rápido — sin eso, tocar dos
   marcadores vecinos acercaría el mapa en vez de abrir el segundo.          */

export const VENTANA = 320;   /* ms entre un toque y el otro */
export const RADIO = 34;      /* px de separación máxima entre los dos */

/* La decisión, sin DOM: así se puede probar. */
export function esDoble(anterior, ahora, { ventana = VENTANA, radio = RADIO } = {}) {
  if (!anterior) return false;
  if (ahora.t - anterior.t > ventana) return false;
  return Math.hypot(ahora.x - anterior.x, ahora.y - anterior.y) <= radio;
}

/* Llama a `alAcercar(x, y)` con la posición del segundo toque, en píxeles de
   pantalla. Devuelve una función que desengancha. */
export function dobleToque(el, alAcercar, opciones = {}) {
  let anterior = null;

  const alSoltar = ev => {
    /* Si todavía quedan dedos apoyados esto es un pellizco, no un toque. */
    if (ev.touches && ev.touches.length) { anterior = null; return; }
    const p = ev.changedTouches && ev.changedTouches[0];
    if (!p) return;
    const ahora = { t: performance.now(), x: p.clientX, y: p.clientY };

    if (esDoble(anterior, ahora, opciones)) {
      /* Sin esto el navegador acerca por su cuenta encima del acercamiento
         nuestro, y el mapa pega un salto doble. */
      ev.preventDefault();
      anterior = null;
      alAcercar(ahora.x, ahora.y);
      return;
    }
    anterior = ahora;
  };

  el.addEventListener('touchend', alSoltar, { passive: false });
  return () => el.removeEventListener('touchend', alSoltar);
}
