/* El selector de mapa del panel.
   -------------------------------------------------------------------------
   Sirve para las dos cosas que el panel necesita ubicar: dónde está un lugar
   nuevo, y dónde exactamente dentro de ese lugar se tomó una memoria. Es el
   mismo mapa y el mismo gesto, así que es un solo módulo: dos selectores
   separados se habrían ido separando más con cada arreglo.

   Por qué tiene zoom. El mapa del casco mide 4.410 × 4.457 metros. Dibujado a
   640 px eso da 6,9 metros por píxel, y una escuela de 100 × 60 metros ocupa
   catorce píxeles de ancho: el patio y el salón de actos caen sobre el mismo
   píxel. Sin acercarse, la precisión que pide la Regla 4 no se puede ingresar
   aunque la base la soporte. Hacen falta unos 22 aumentos para que una escuela
   ocupe media ventana.

   El zoom se aplica a un <g> adentro del svg y la posición del clic se mide
   contra ESE grupo, no contra el svg ni contra el recuadro. Así la cuenta
   sobrevive a cualquier combinación de acercamiento, desplazamiento y
   centrado: getScreenCTM del grupo devuelve la transformación real y la
   inversa acierta siempre.                                                  */

import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { aLatLon, aNormalizado, caeDentro } from '../proyeccion.js';
import { dobleToque } from '../doble-toque.js';

const ACERCAMIENTO_MAXIMO = 40;   /* más que los 22 que pide una escuela */
let mapasCache = null;

export async function cargarMapas() {
  if (!mapasCache) mapasCache = (await (await fetch('/mapa/mapa.json')).json()).mapas;
  return mapasCache;
}

/* El mapa más chico que contiene el punto; el casco si cabe, si no el ejido.
   Sin punto, el casco: es donde cae casi todo. */
export function elegirMapa(mapas, lat, lng) {
  if (lat == null) return mapas.find(m => m.nombre === 'casco') || mapas[0];
  return mapas.find(m => m.nombre === 'casco' && caeDentro(lat, lng, m))
      || mapas.find(m => caeDentro(lat, lng, m))
      || mapas.find(m => m.nombre === 'ejido')
      || mapas[0];
}

/**
 * Monta el selector dentro de `caja`.
 * @param {HTMLElement} caja  contenedor vacío
 * @param {object} opciones
 *   onElegir(lat, lng)   se llama en cada clic sobre el mapa
 *   centro {lat,lng}     dónde arrancar; sin esto, el mapa entero
 *   acercar              aumentos iniciales cuando hay centro
 *   referencia {lat,lng,nombre}  un punto de contexto que se dibuja aparte
 */
export async function montarSelector(caja, opciones = {}) {
  const { onElegir, centro, acercar = 12, referencia } = opciones;

  const mapas = await cargarMapas();
  const mapa = elegirMapa(mapas, centro?.lat ?? referencia?.lat, centro?.lng ?? referencia?.lng);
  const [vx, vy] = mapa.viewBox;

  caja.innerHTML = await (await fetch(`/mapa/${mapa.nombre}.svg`)).text();
  const svg = caja.querySelector('svg');
  if (!svg) throw new Error('El mapa no se pudo dibujar.');

  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('viewBox', `0 0 ${vx} ${vy}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  caja.style.setProperty('--prop', vx + ' / ' + vy);

  /* Todo el dibujo se mete en un grupo, y el zoom transforma ese grupo. Las
     marcas van en otro grupo hermano adentro del mismo, para que se muevan
     con el mapa pero puedan tener su propio tamaño compensado. */
  const lienzo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  while (svg.firstChild) lienzo.append(svg.firstChild);
  svg.append(lienzo);

  const marcas = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marcas.setAttribute('class', 'marcas');
  lienzo.append(marcas);

  /* ---- las marcas ---- */
  /* El radio se guarda en PÍXELES DE PANTALLA y se traduce a unidades del
     dibujo cada vez. Guardarlo en unidades del dibujo —que fue mi primer
     intento— no sirve: el viewBox mide 2000 unidades dibujadas en unos 500
     píxeles, así que una unidad es un cuarto de píxel, y a dieciséis aumentos
     la marca quedaba en dos píxeles. Invisible justo cuando más se la
     necesita. Traducido en el momento, además se corrige solo si cambia el
     tamaño de la ventana. */
  const circulo = (clase, px) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', clase);
    c.dataset.px = px;
    c.style.display = 'none';
    marcas.append(c);
    return c;
  };

  const unidadesPorPixel = () => {
    const ancho = caja.getBoundingClientRect().width;
    return ancho ? vx / ancho : 1;
  };

  function ajustarMarcas(k) {
    const u = unidadesPorPixel();
    for (const el of marcas.children) {
      if (el.dataset.px) el.setAttribute('r', (+el.dataset.px * u / k).toFixed(2));
    }
  }
  /* El punto de referencia —el lugar, cuando se está marcando una memoria—
     se dibuja distinto del que se está eligiendo: son dos cosas, y si
     comparten lenguaje visual nadie sabe cuál acaba de marcar. */
  const elRef = circulo('marca-ref', 11);   /* el lugar: aro punteado  */
  const elPin = circulo('marca-pin', 7);    /* lo que se está eligiendo */

  const ponerEn = (el, lat, lng) => {
    if (lat == null) { el.style.display = 'none'; return; }
    const { x, y } = aNormalizado(lat, lng, mapa);
    el.setAttribute('cx', x * vx);
    el.setAttribute('cy', y * vy);
    el.style.display = '';
  };

  if (referencia?.lat != null) {
    ponerEn(elRef, referencia.lat, referencia.lng);
    if (referencia.nombre) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = referencia.nombre;
      elRef.append(t);
    }
  }

  /* ---- zoom y desplazamiento ---- */
  const zm = d3zoom()
    .scaleExtent([1, ACERCAMIENTO_MAXIMO])
    .translateExtent([[0, 0], [vx, vy]])
    .on('zoom', ({ transform }) => {
      lienzo.setAttribute('transform', transform.toString());
      /* Las marcas no crecen con el mapa: un círculo de siete unidades a
         cuarenta aumentos taparía la manzana entera, y lo que se está
         eligiendo dejaría de verse. */
      ajustarMarcas(transform.k);
      caja.dataset.aumentos = transform.k.toFixed(2);
    });

  const sel = select(svg);
  sel.call(zm);
  /* El doble clic acerca, como en cualquier mapa. Antes estaba apagado por
     miedo a que peleara con marcar el punto, y no pelea: el primer clic ya
     marcó, el segundo marca en el mismo lugar, y recién después el mapa se
     acerca sobre esa marca. Que es justo lo que uno quiere al ubicar algo con
     precisión — marcar, y acercarse a ver si quedó bien.

     El doble toque va aparte: con `touch-action: none` el navegador deja de
     emitir `dblclick` de forma confiable en el teléfono. */
  dobleToque(svg, (x, y) => {
    const c = svg.getBoundingClientRect();
    zm.scaleBy(sel, 2, [x - c.left, y - c.top]);
  });

  /* ---- marcar ---- */
  let elegido = null;

  svg.addEventListener('click', e => {
    /* La posición se mide contra el sistema de coordenadas del grupo que
       lleva el zoom. Contra el recuadro, las franjas vacías del centrado y
       el acercamiento corren la cuenta y el punto cae a cien metros. */
    const ctm = lienzo.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const x = p.x / vx, y = p.y / vy;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    const { lat, lon } = aLatLon(x, y, mapa);
    elegido = { lat, lng: lon };
    ponerEn(elPin, lat, lon);
    ajustarMarcas(+(caja.dataset.aumentos || 1));
    onElegir?.(lat, lon);
  });

  /* ---- la vista inicial ---- */
  function irA(lat, lng, k = acercar) {
    if (lat == null) { sel.call(zm.transform, zoomIdentity); return; }
    const { x, y } = aNormalizado(lat, lng, mapa);
    const t = zoomIdentity
      .translate(vx / 2 - x * vx * k, vy / 2 - y * vy * k)
      .scale(k);
    sel.call(zm.transform, t);
  }

  ajustarMarcas(1);

  const arranque = centro ?? referencia;
  if (arranque?.lat != null) irA(arranque.lat, arranque.lng);
  else ajustarMarcas(1);

  return {
    mapa,
    irA,
    /* Sin transición a propósito: animarlo obligaba a traer d3-transition, que
       pesa más que todo el resto del panel junto, y volver a ver el mapa
       entero de golpe se entiende igual o mejor que con un deslizamiento. */
    acercarA: k => sel.call(zm.scaleTo, k),
    verTodo: () => sel.call(zm.transform, zoomIdentity),
    marcar(lat, lng) { elegido = lat == null ? null : { lat, lng }; ponerEn(elPin, lat, lng); },
    get elegido() { return elegido; },
  };
}

/* Lee un par de coordenadas escritas a mano. Acepta la coma decimal, el punto,
   y los separadores que salen de copiar de Google Maps. */
export function leerCoordenadas(texto) {
  const m = (texto || '').trim()
    .match(/^\s*(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1].replace(',', '.'));
  const lng = parseFloat(m[2].replace(',', '.'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
