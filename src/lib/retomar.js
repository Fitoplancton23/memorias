/* Retomar la lectura donde quedó.
   ==========================================================================
   El recorrido que este archivo promete —lugar, memoria, persona, familia,
   memoria, lugar— tiene un costo que no se ve hasta que alguien lo camina:
   a los cuatro pasos ya no hay forma de volver a donde se estaba leyendo.
   El botón de atrás da UN paso, y deshacer cuatro clics de a uno, pasando de
   nuevo por cada pantalla intermedia, no es volver: es rehacer el camino en
   reversa.

   Así que son dos botones distintos y no uno con dos sentidos:

     Atrás                      un paso, el de recién.
     Volver a la línea de tiempo    el lugar donde se estaba leyendo, de una.

   Lo que se guarda no es "la última vez que pasé por /memorias/": es la
   lectura. Llegar a /memorias/?apellido=Jutkowski desde la ficha de una
   persona no es ponerse a leer el archivo, es ver el resultado de un enlace
   —una parada del camino—, y si eso pisara la posición guardada, el botón
   devolvería a la parada en vez de a la lectura, que es justo lo que viene a
   evitar. Por eso una llegada con filtros en la dirección no se guarda.

   Los filtros puestos a mano con los chips SÍ son parte de la lectura:
   los eligió quien está leyendo, no un enlace. */

/* Las llaves que, en la dirección, dicen "esta visita vino de un enlace
   armado" y no de alguien leyendo. `ver` abre una memoria concreta; `q` es
   una búsqueda que se trajo el conmutador desde el mapa. */
const DE_ENLACE = ['decada', 'apellido', 'lugar', 'q', 'ver'];

export function esLectura(busqueda) {
  const p = new URLSearchParams(busqueda || '');
  return !DE_ENLACE.some(k => p.get(k));
}

export function aParametros(estado) {
  const p = new URLSearchParams();
  const f = (estado && estado.filtros) || {};
  for (const k of ['decada', 'apellido', 'lugar']) if (f[k]) p.set(k, f[k]);
  if (estado && estado.q) p.set('q', estado.q);
  return p.toString();
}

export function destino(estado) {
  const p = aParametros(estado);
  return p ? `/memorias/?${p}` : '/memorias/';
}

/* ¿Hay algo distinto a lo que volver?
   -------------------------------------------------------------------------
   Un botón que lleva a donde ya estás no es un botón: es ruido que además
   enseña que los botones de esta pantalla a veces no hacen nada. Si quien
   mira ya está en la línea de tiempo viendo exactamente lo guardado, no se
   ofrece. La posición de la página no entra en la comparación a propósito:
   bajar tres memorias leyendo no convierte la pantalla en otra cosa, y un
   botón que aparece y desaparece al rodar la rueda es peor que no tenerlo. */
export function conviene(guardado, actual) {
  if (!guardado) return false;
  if (!actual || !actual.enLaLinea) return true;
  return aParametros(guardado) !== aParametros(actual);
}
