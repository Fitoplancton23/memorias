/* Acercar una fotografía.
   -------------------------------------------------------------------------
   Esto no es una comodidad: es el acto central del archivo. La pregunta que
   trae a la gente —«¿quién es el de la izquierda?»— se contesta acercándose a
   una cara. Un archivo de fotografías viejas en el que no se puede acercar es
   un archivo que no se puede leer.

   Cómo lo resuelven los dos lugares donde la gente ya aprendió el gesto:

   Instagram, en el muro, deja «asomarse»: el pellizco agranda la foto
   mientras tenés los dedos apoyados y al soltar vuelve sola. Es un vistazo,
   no una lectura. Acá no sirve: si la foto vuelve al soltar, no se puede
   recorrer una cara, ni comparar dos, ni mostrarle la pantalla a alguien.

   Facebook, en su visor, deja el acercamiento PUESTO: doble toque acerca y se
   queda, el pellizco acerca libre, arrastrar recorre, y recién cuando volvés
   a alejar la foto queda como estaba. Ese es el modelo que copiamos.

   Las tres decisiones que no se ven y que importan más que el gesto:

   1. EL TOPE LO PONE EL ESCANEO, PERO HAY UN PISO. Si la foto tiene 3000 px
      de ancho y se muestra a 600, se puede acercar cinco veces y cada paso
      muestra detalle que estaba ahí. La primera versión cortaba ahí y nada
      más: con un escaneo de 900 px en una pantalla de escritorio el tope
      daba 1,22 y la lupa no hacía casi nada — medido, y es lo que se vio.
      Acercar más allá de la resolución no inventa un dato, agranda el que
      hay; lo que no se puede hacer es dejar de poder leer una cara porque
      el escaneo vino chico. Así que se garantizan 2,5x siempre, y de ahí
      para arriba manda la resolución real, hasta 8x. La regla de no
      inventar precisión sigue valiendo donde importa: en las coordenadas,
      las fechas y los nombres, que son datos. Un píxel agrandado no afirma
      nada.

   2. ARRASTRAR TIENE UN SOLO SIGNIFICADO POR VEZ. Con la foto en su tamaño,
      arrastrar de lado pasa de foto. Acercada, arrastrar recorre y NUNCA pasa
      de foto. Facebook, al llegar al borde de la imagen, le devuelve el gesto
      al carrusel; es ingenioso y es exactamente lo que no queremos acá,
      porque convierte el borde en una frontera invisible. Para pasar de foto
      se aleja primero — o se usa la flecha, que sigue viva.

   3. NUNCA QUEDA HUECO DENTRO DEL CUADRO. Si la imagen tapa el cuadro, se
      pega a los bordes; si no lo tapa (está en su tamaño, o es más angosta
      que el cuadro), queda centrada en ese eje. Las dos cosas salen de la
      misma cuenta y están cubiertas por tests.

   El estado es {k, x, y}: k la escala, x e y el corrimiento en píxeles del
   cuadro, para `translate(x,y) scale(k)` con el origen en la esquina.        */

export const LUPA = {
  TOPE_DOBLE: 2.5,    /* a cuánto lleva el doble toque y el botón */
  GARANTIZADO: 2.5,   /* hasta acá se llega siempre, lo dé el escaneo o no */
  TECHO: 8,           /* más que esto es perderse adentro de la foto */
};

/* El rectángulo que ocupa la imagen dentro del cuadro sin deformarse: lo que
   hace `object-fit: contain`, pero en números, porque de acá sale todo lo
   demás. */
export function encuadre(natural, cuadro) {
  const [nw, nh] = natural, [fw, fh] = cuadro;
  if (!(nw > 0 && nh > 0 && fw > 0 && fh > 0)) return [0, 0];
  const k = Math.min(fw / nw, fh / nh);
  return [nw * k, nh * k];
}

/* Dónde está el 1:1: un píxel de la pantalla, un píxel del escaneo. De acá
   para abajo cada paso descubre detalle que estaba en el archivo. */
export function nativo(natural, encuadrada) {
  const [nw] = natural, [sw] = encuadrada;
  if (!(sw > 0)) return 1;
  return Math.max(1, nw / sw);
}

/* Hasta dónde se deja acercar. Nunca menos del piso garantizado —si no, un
   escaneo chico deja la lupa sin efecto— ni más del techo. */
export function tope(natural, encuadrada) {
  return Math.min(LUPA.TECHO, Math.max(LUPA.GARANTIZADO, nativo(natural, encuadrada)));
}

/* Un eje: si el contenido tapa el cuadro se pega a los bordes, si no, se
   centra. Devuelve el corrimiento que corresponde. */
export function eje(off, contenido, cuadro) {
  if (contenido <= cuadro) return (cuadro - contenido) / 2;
  return Math.min(0, Math.max(cuadro - contenido, off));
}

/* El estado válido más cercano al que se pide. */
export function encajar(estado, geo) {
  const [fw, fh] = geo.cuadro, [sw, sh] = geo.encuadrada;
  const k = Math.min(Math.max(1, estado.k), geo.tope);
  return { k, x: eje(estado.x, sw * k, fw), y: eje(estado.y, sh * k, fh) };
}

/* Acercar o alejar dejando quieto el punto que tocaste. `punto` va en
   píxeles del cuadro, con el origen en su esquina. */
export function acercar(estado, geo, punto, kPedida) {
  const k = Math.min(Math.max(1, kPedida), geo.tope);
  const [px, py] = punto;
  /* Dónde cae ese punto dentro de la imagen, en unidades de la imagen. */
  const cx = (px - estado.x) / estado.k;
  const cy = (py - estado.y) / estado.k;
  return encajar({ k, x: px - cx * k, y: py - cy * k }, geo);
}

/* Recorrer: mover el corrimiento y volver a encajar. */
export function recorrer(estado, geo, dx, dy) {
  return encajar({ k: estado.k, x: estado.x + dx, y: estado.y + dy }, geo);
}

/* Todo lo que depende del tamaño, junto, para no recalcularlo suelto. */
export function geometria(natural, cuadro) {
  const encuadrada = encuadre(natural, cuadro);
  return { cuadro, encuadrada, tope: tope(natural, encuadrada),
           nativo: nativo(natural, encuadrada) };
}

/* El estado de partida: la foto en su tamaño, centrada. */
export function inicial(geo) {
  return encajar({ k: 1, x: 0, y: 0 }, geo);
}

/* ¿Hay hueco dentro del cuadro? El invariante, para los tests y para
   romperlo a propósito. */
export function hayHueco(estado, geo) {
  const [fw, fh] = geo.cuadro, [sw, sh] = geo.encuadrada;
  const w = sw * estado.k, h = sh * estado.k;
  const E = 1e-9;
  /* Si el contenido tapa el cuadro en un eje, no puede quedar borde a la
     vista en ese eje. */
  if (w >= fw - E && (estado.x > E || estado.x + w < fw - E)) return true;
  if (h >= fh - E && (estado.y > E || estado.y + h < fh - E)) return true;
  /* Si no lo tapa, tiene que estar centrado. */
  if (w < fw - E && Math.abs(estado.x - (fw - w) / 2) > 1e-6) return true;
  if (h < fh - E && Math.abs(estado.y - (fh - h) / 2) > 1e-6) return true;
  return false;
}
