/* El vuelo de entrada al mapa.
   -------------------------------------------------------------------------
   La primera vez, el mapa abre mostrando el territorio y se acerca solo hasta
   el casco. No es un adorno: es la única forma de decir, sin una sola
   palabra, que el mapa se mueve. Alguien que entra y ve una pantalla quieta
   no tiene por qué saber que puede arrastrarla y pellizcarla — y si no lo
   sabe, el archivo entero queda detrás de un gesto que nadie hizo.

   Se hace una vez. Quien ya estuvo vuelve a donde dejó el mapa, y repetir el
   vuelo en cada visita sería hacerle esperar lo mismo todos los días.

   La cuenta vive acá y aparte porque es lo que decide si el movimiento se lee
   como un acercamiento o como un tirón.                                     */

/* Qué punto del mundo está en el centro de lo que se ve. */
export function centro(t, ancho, alto) {
  const k = t.k || 1;
  return [(ancho / 2 - t.x) / k, (alto / 2 - t.y) / k];
}

/* El encuadre a mitad de camino.
   -------------------------------------------------------------------------
   Dos decisiones, y las dos se notan si se hacen al revés:

   · La escala se interpola GEOMÉTRICAMENTE —sobre su logaritmo— y no en línea
     recta. Acercar de 1 a 9 en línea recta reparte el movimiento en partes
     iguales de escala, y la escala no se percibe así: la primera mitad del
     vuelo pasa volando y la segunda se arrastra. Sobre el logaritmo, cada
     tramo del vuelo duplica lo mismo, que es como el ojo lo lee.

   · Lo que se interpola es el CENTRO de lo que se ve, no `x` e `y` de la
     transformación. `x` e `y` están multiplicados por la escala, así que
     moverlos en línea recta mientras la escala cambia hace que el mapa salga
     de cuadro y vuelva — se ve como un tirón lateral a mitad de camino.    */
export function entre(a, b, u, ancho, alto) {
  const t = Math.min(1, Math.max(0, u));
  const ka = a.k || 1, kb = b.k || 1;
  const k = ka * Math.pow(kb / ka, t);
  const ca = centro(a, ancho, alto), cb = centro(b, ancho, alto);
  const cx = ca[0] + (cb[0] - ca[0]) * t;
  const cy = ca[1] + (cb[1] - ca[1]) * t;
  return { k, x: ancho / 2 - cx * k, y: alto / 2 - cy * k };
}

/* El encuadre que hace entrar una caja.
   -------------------------------------------------------------------------
   Con qué abre el mapa no puede depender de cuántas memorias haya cargadas.
   La primera versión encuadraba "los lugares que caen dentro del casco", y
   con los datos de verdad eso es UN lugar: el mapa abría zambullido en la
   Plaza Libertad, apuntando a un marcador en vez de al pueblo. Mañana, con
   tres lugares más, abriría en otro lado — y nadie habría cambiado nada.

   El casco es un rectángulo del mapa, medido una vez y escrito en
   `mapa.json`. Eso no se mueve cuando entra una foto, que es justo lo que se
   le pide al encuadre de entrada.

   `caja` y `vista` van en unidades del dibujo. El margen también. */
/* Y el piso de la caja es proporcional a lo que se ve, no una unidad suelta.
   Con un piso de 1, una caja degenerada daba mil seiscientos ochenta y seis
   aumentos: finito, y absurdo. La cuarentava parte de la vista es el tope de
   acercamiento del mapa, así que proponer más es proponer algo que el mapa va
   a recortar igual. */
export const TROZO_MINIMO = 40;

/* `vista` es lo que se ve DE VERDAD, en unidades del dibujo, y no el
   `viewBox`. En un teléfono la pantalla es mucho más alta que el recuadro del
   dibujo, así que calcular la escala contra el viewBox daba una escala que no
   dejaba margen para centrar: el mapa quedaba pegado a su borde y el punto
   pedido se corría más de un kilómetro. Medido: 1276 m en 390x844.

   `foco` es dónde cae el centro de la caja, también en unidades. Por defecto
   el medio de la vista; el mapa pasa el medio del dibujo, que es donde
   `preserveAspectRatio` centra el contenido. Son dos cosas distintas cuando
   la pantalla y el dibujo no tienen la misma forma, y confundirlas fue
   exactamente el error. */
export function encuadreDeCaja(caja, vista, margen = 0, foco) {
  const ancho = Math.max(vista.ancho / TROZO_MINIMO, caja.ancho) + margen * 2;
  const alto = Math.max(vista.alto / TROZO_MINIMO, caja.alto) + margen * 2;
  const k = Math.min(vista.ancho / ancho, vista.alto / alto);
  const [fx, fy] = foco || [vista.ancho / 2, vista.alto / 2];
  return { k, x: fx - caja.cx * k, y: fy - caja.cy * k };
}

/* La curva del movimiento: arranca y termina despacio. Un vuelo que frena de
   golpe se lee como que algo se rompió. */
export const suave = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
