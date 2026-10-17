/* La composición de una memoria para una historia de Instagram.
   ==========================================================================
   Acá se decide DÓNDE va cada cosa en los 1080 × 1920; quien dibuja —el
   canvas, en el navegador— no toma ninguna decisión, sólo pinta lo que este
   archivo devolvió. Están separados por la misma razón de siempre: una
   posición se puede probar, un trazo en un canvas no.

   Las reglas que esto sostiene, y que los tests verifican:

   **Nada entra en las zonas que tapa Instagram.** La aplicación dibuja su
   propia interfaz arriba y abajo de la historia; lo que quede ahí no es que
   se vea mal, es que no se ve. Se reserva el 13% de alto en cada punta.

   **La fotografía manda y nunca se deforma.** Es el motivo por el que alguien
   se va a detener en la historia. Entra entera, con su proporción intacta
   —ni recortada ni estirada— y se queda con todo el espacio que el texto no
   necesita, no con una franja fija.

   **Lo que el archivo no sabe no ocupa lugar.** Una memoria sin fecha no
   lleva «dato pendiente» acá: en la ficha ese rótulo dice «alguien lo va a
   completar», que es verdad y es útil; en una historia, frente a alguien que
   no conoce el archivo, es un renglón vacío que le saca aire a la foto. Lo
   que falta no se nombra, se omite, y la composición se cierra sola.

   **El texto se achica antes de cortarse.** Un título cortado pierde
   justamente lo que alguien tiene que entender de un vistazo. Recién cuando
   ya no entra ni en el cuerpo más chico se corta, y con puntos suspensivos
   para que se vea que sigue.

   Medir el ancho de un texto depende de la tipografía, así que la medición
   entra como función (`medir`): el navegador pasa la del canvas y los tests
   pasan una sintética. Así esto se puede probar sin un navegador. */

export const ANCHO = 1080;
export const ALTO = 1920;

/* Lo que tapa la interfaz de Instagram, arriba y abajo. 250 px de 1920 es lo
   que recomienda su propia guía; se redondea a 260 para no quedar al filo. */
export const ZONA_SEGURA = 260;
const MARGEN = 90;

export const CAJA = {
  x: MARGEN,
  y: ZONA_SEGURA + 40,
  ancho: ANCHO - MARGEN * 2,
  alto: ALTO - (ZONA_SEGURA + 40) * 2,
};

/* Cuerpos tipográficos. El título arranca grande y baja hasta el piso; abajo
   de ahí se lee mal en un teléfono a un metro de distancia. */
const TITULO_MAX = 68, TITULO_MIN = 42, TITULO_LINEAS = 4;
/* Sin fotografía el título es lo único que hay, así que crece y se lleva la
   pantalla. Una memoria sin foto —un relato, un recorte que todavía no se
   escaneó— no puede salir como una placa casi vacía con un renglón abajo. */
const TITULO_SOLO = 92;
const SOBRE = 32, PIE_DATO = 34, FIRMA = 30, LLAMADA = 32;
const ALTO_MARCA = 74;
const AIRE = 44;
const FOTO_MINIMA = 420;

const vacio = t => !t || !String(t).trim();

/* Partir un texto en renglones que entren en `ancho`. Devuelve null si no
   entra ni partiendo: ahí quien llama baja el cuerpo y vuelve a probar. */
export function renglones(texto, ancho, tam, medir, maxLineas) {
  const palabras = String(texto).trim().split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (medir(prueba, tam) <= ancho) { actual = prueba; continue; }
    if (actual) lineas.push(actual);
    /* Una palabra sola más ancha que la caja: no hay partido posible que no
       sea cortarla, y cortar un apellido al medio es ilegible. Se avisa. */
    if (medir(p, tam) > ancho) return null;
    actual = p;
    if (lineas.length > maxLineas) return null;
  }
  if (actual) lineas.push(actual);
  return lineas.length <= maxLineas ? lineas : null;
}

/* El último recurso: el cuerpo ya está en el piso y el título sigue sin
   entrar. Se corta donde entre y se marca con puntos suspensivos. */
function recortar(texto, ancho, tam, medir, maxLineas) {
  const palabras = String(texto).trim().split(/\s+/).filter(Boolean);
  let mejor = [];
  for (let n = palabras.length; n > 0; n--) {
    const r = renglones(palabras.slice(0, n).join(' ') + '…', ancho, tam, medir, maxLineas);
    if (r) { mejor = r; break; }
  }
  return mejor.length ? mejor : ['…'];
}

/* ¿Cómo se lee la fecha arriba de todo? Las mismas palabras que usa la ficha:
   dos maneras de decir el mismo año en dos pantallas distintas obligan a
   aprender dos veces lo mismo. */
export function comoSeLeeLaFecha(fecha) {
  if (!fecha || fecha.ref == null) return '';
  if (fecha.precision === 'decada') return `Década de ${Math.floor(fecha.ref / 10) * 10}`;
  if (fecha.precision === 'circa') return `Aprox. ${fecha.ref}`;
  return String(fecha.ref);
}

/**
 * @param m  { titulo, fecha, lugar, foto: { ancho, alto } | null }
 * @param medir  (texto, tam) => ancho en px
 * @param opciones { marca, parajes, llamada, enlace }
 */
export function componer(m = {}, medir, o = {}) {
  const marca = o.marca || 'Memorias';
  const parajes = o.parajes || '';
  const llamada = o.llamada || 'La historia completa, en';
  const enlace = o.enlace || '';
  const bloques = [];

  /* --- la firma, arriba --- */
  bloques.push({ tipo: 'marca', x: CAJA.x, y: CAJA.y, ancho: CAJA.ancho, alto: ALTO_MARCA,
                 texto: marca, bajada: parajes });

  /* --- el pie: llamada y enlace, pegados al borde de abajo de la zona útil --- */
  const altoPie = LLAMADA * 1.25 + FIRMA * 1.35;
  const yPie = CAJA.y + CAJA.alto - altoPie;
  bloques.push({ tipo: 'pie', x: CAJA.x, y: yPie, ancho: CAJA.ancho, alto: altoPie,
                 llamada, enlace, tam: LLAMADA, tamEnlace: FIRMA });

  /* --- el bloque de texto, justo encima del pie ---
     Se arma de abajo hacia arriba porque su alto depende de cuántos renglones
     necesite el título, y de eso depende lo que le queda a la foto. */
  const sobre = comoSeLeeLaFecha(m.fecha);
  const lugar = vacio(m.lugar) ? '' : String(m.lugar).trim();

  const arriba = CAJA.y + ALTO_MARCA + AIRE;

  /* Lo que haya de foto se sabe antes de acomodar el texto, porque cambia el
     cuerpo del título y el lugar del bloque. Y si después resulta que a la
     foto no le queda espacio suficiente, se arma de nuevo como si no hubiera
     foto: una franja de doscientos píxeles con una fotografía de familia
     adentro no es mostrar la foto, es decir que había una. */
  const hayFoto = !!(m.foto && m.foto.ancho > 0 && m.foto.alto > 0);

  const armar = conFoto => {
    const techo = conFoto ? TITULO_MAX : TITULO_SOLO;
    let tam = techo, lineas = null;
    if (!vacio(m.titulo)) {
      for (; tam >= TITULO_MIN; tam -= 2) {
        lineas = renglones(m.titulo, CAJA.ancho, tam, medir, TITULO_LINEAS);
        if (lineas) break;
      }
      if (!lineas) { tam = TITULO_MIN; lineas = recortar(m.titulo, CAJA.ancho, tam, medir, TITULO_LINEAS); }
    }
    const altoSobre = sobre ? SOBRE * 1.3 + 18 : 0;
    const altoTitulo = lineas ? lineas.length * tam * 1.16 : 0;
    const altoLugar = lugar ? PIE_DATO * 1.3 + 14 : 0;
    const altoTexto = altoSobre + altoTitulo + altoLugar;
    /* Con foto el texto se apoya sobre el pie y la foto se queda con el resto.
       Sin foto no hay "resto": el texto se centra en todo lo que hay, porque
       si no queda pegado abajo con media pantalla de papel en blanco arriba. */
    const yTexto = conFoto
      ? yPie - AIRE - altoTexto
      : arriba + ((yPie - AIRE - arriba) - altoTexto) / 2;
    return { tam, lineas, altoSobre, altoTitulo, altoLugar, altoTexto, yTexto };
  };

  let t = armar(hayFoto);
  let conFoto = hayFoto && (t.yTexto - AIRE - arriba) >= FOTO_MINIMA;
  if (hayFoto && !conFoto) t = armar(false);

  /* La foto y el texto son UN bloque, y ese bloque se centra entre la firma y
     el pie. La primera versión apoyaba la foto contra el texto y el sobrante
     quedaba todo arriba: con una foto apaisada —media pantalla de alto— eso
     dejaba un hueco de cuatrocientos píxeles de papel en blanco debajo de la
     firma, y la historia parecía empezar por la mitad. Partido en dos, el aire
     se lee como margen y no como olvido. */
  let caja_foto = null;
  let { tam, lineas, altoSobre, altoTitulo, altoTexto, yTexto } = t;
  if (conFoto) {
    const espacio = yPie - AIRE - arriba;
    const libre = espacio - altoTexto - AIRE;
    const k = Math.min(CAJA.ancho / m.foto.ancho, libre / m.foto.alto);
    const w = m.foto.ancho * k, h = m.foto.alto * k;
    const grupo = h + AIRE + altoTexto;
    const yGrupo = arriba + (espacio - grupo) / 2;
    caja_foto = { x: Math.round(CAJA.x + (CAJA.ancho - w) / 2), y: Math.round(yGrupo),
                  ancho: Math.round(w), alto: Math.round(h) };
    yTexto = yGrupo + h + AIRE;
  }

  let y = yTexto;
  if (sobre) {
    bloques.push({ tipo: 'sobretitulo', x: CAJA.x, y, ancho: CAJA.ancho,
                   alto: SOBRE * 1.3, texto: sobre, tam: SOBRE });
    y += altoSobre;
  }
  if (lineas) {
    bloques.push({ tipo: 'titulo', x: CAJA.x, y, ancho: CAJA.ancho, alto: altoTitulo,
                   lineas, tam, interlinea: tam * 1.16 });
    y += altoTitulo;
  }
  if (lugar) {
    bloques.push({ tipo: 'lugar', x: CAJA.x, y: y + 14, ancho: CAJA.ancho,
                   alto: PIE_DATO * 1.3, texto: lugar, tam: PIE_DATO });
  }

  if (caja_foto) bloques.push({ tipo: 'foto', ...caja_foto });

  return { ancho: ANCHO, alto: ALTO, caja: CAJA, bloques };
}

export const bloque = (c, tipo) => c.bloques.find(b => b.tipo === tipo) || null;
