/* Pintar la composición. Acá no se decide nada: todas las posiciones vienen
   de `componer()` (src/lib/historia.js, con tests). Esto sólo pasa la tinta.
   ========================================================================= */
import { componer, ANCHO, ALTO, CAJA, comoSeLeeLaFecha } from './historia.js';

const PAPEL = '#f6f4ea';
const TINTA = '#181e1b';
const TINTA_2 = '#5c6b64';
const MARCA = '#374c3b';
const PLACA = '#ffffff';
const LINEA = '#b4bda6';
const TIPOGRAFIA = "'Google Sans','Figtree',system-ui,sans-serif";

/* El isotipo, el mismo trazado que el del sitio (src/components/Isotipo.astro). */
const ISO = 'M48.05,294.17c0,87.86,38.52,166.73,99.59,220.63,51.86,45.77,119.97-139.73,194.58-139.73,74.6,0,142.72,185.5,194.58,139.73,61.07-53.9,99.59-132.77,99.59-220.63C636.38,131.7,504.68,0,342.21,0S48.05,131.7,48.05,294.17ZM504.01,294.17c0,48.32-21.19,91.7-54.78,121.35-28.52,25.17-65.98,40.45-107.02,40.45-41.03,0-78.5-15.27-107.02-40.45-33.59-29.65-54.78-73.02-54.78-121.35,0-89.36,72.44-161.79,161.79-161.79s161.79,72.44,161.79,161.79Z';
const ISO_ANCHO = 636.38, ISO_ALTO = 522.06;

const fuente = (tam, peso = 400) => `${peso} ${tam}px ${TIPOGRAFIA}`;

/* Las tipografías del sitio bajan de la red. Si el canvas dibuja antes de que
   estén, usa la de respaldo y la imagen sale con otra letra —y nadie lo nota
   hasta que la historia ya está publicada—. */
export async function esperarTipografias() {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load(`500 68px 'Figtree'`),
    document.fonts.load(`400 32px 'Figtree'`),
  ]).catch(() => {});
  await document.fonts.ready;
}

/* Cargar la fotografía de modo que el canvas no quede "contaminado": sin
   `crossOrigin` el navegador deja dibujarla pero no deja exportar la imagen,
   y el error aparece recién al final, cuando ya se ve todo bien en pantalla. */
export function cargarFoto(url) {
  return new Promise((listo, falla) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => listo(img);
    img.onerror = () => falla(new Error('no se pudo leer la fotografía'));
    img.src = url;
  });
}

function redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fondo(ctx) {
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  /* Una aguada de salvia abajo, muy baja, que es lo que hace que el papel no
     parezca un rectángulo liso. La botánica del sitio no se repite acá: en
     1080 px compitiendo con una foto de familia, una hoja es ruido. */
  const g = ctx.createLinearGradient(0, ALTO * 0.55, 0, ALTO);
  g.addColorStop(0, 'rgba(55,76,59,0)');
  g.addColorStop(1, 'rgba(55,76,59,.07)');
  ctx.fillStyle = g;
  ctx.fillRect(0, ALTO * 0.55, ANCHO, ALTO * 0.45);
}

function marca(ctx, b) {
  const alto = 52;
  const k = alto / ISO_ALTO;
  ctx.save();
  ctx.translate(b.x, b.y + 2);
  ctx.scale(k, k);
  ctx.fillStyle = MARCA;
  ctx.fill(new Path2D(ISO));
  ctx.restore();

  const x = b.x + ISO_ANCHO * k + 20;
  ctx.fillStyle = TINTA;
  ctx.font = fuente(38, 500);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(b.texto, x, b.y + 34);
  if (b.bajada) {
    ctx.fillStyle = TINTA_2;
    ctx.font = fuente(21, 400);
    ctx.fillText(b.bajada.toUpperCase(), x, b.y + 62);
  }
}

function foto(ctx, b, img) {
  ctx.save();
  ctx.shadowColor = 'rgba(24,30,27,.22)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = PLACA;
  /* La placa: el blanco del papel fotográfico, con un borde parejo. Es la
     única superficie sin tramar del sistema visual, igual que en el sitio. */
  redondeado(ctx, b.x - 18, b.y - 18, b.ancho + 36, b.alto + 36, 8);
  ctx.fill();
  ctx.restore();
  /* La fotografía entera, con su proporción: `componer()` ya calculó la caja
     respetándola, así que acá va un dibujo directo y ningún recorte. */
  ctx.drawImage(img, b.x, b.y, b.ancho, b.alto);
}

function sobretitulo(ctx, b) {
  ctx.fillStyle = MARCA;
  ctx.font = fuente(b.tam, 500);
  ctx.textBaseline = 'top';
  const letras = b.texto.toUpperCase().split('');
  let x = b.x;
  for (const l of letras) { ctx.fillText(l, x, b.y); x += ctx.measureText(l).width + 3; }
}

function titulo(ctx, b) {
  ctx.fillStyle = TINTA;
  ctx.font = fuente(b.tam, 500);
  ctx.textBaseline = 'top';
  b.lineas.forEach((l, i) => ctx.fillText(l, b.x, b.y + i * b.interlinea));
}

function lugar(ctx, b) {
  ctx.fillStyle = TINTA_2;
  ctx.font = fuente(b.tam, 400);
  ctx.textBaseline = 'top';
  ctx.fillText(b.texto, b.x, b.y);
}

function pie(ctx, b) {
  ctx.strokeStyle = LINEA;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y - 26);
  ctx.lineTo(b.x + b.ancho, b.y - 26);
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.fillStyle = TINTA_2;
  ctx.font = fuente(b.tam, 400);
  ctx.fillText(b.llamada, b.x, b.y);
  ctx.fillStyle = MARCA;
  ctx.font = fuente(b.tamEnlace, 500);
  ctx.fillText(b.enlace, b.x, b.y + b.tam * 1.25);
}

/** Dibuja la historia y devuelve el canvas. */
export async function dibujar(memoria, opciones = {}) {
  const lienzo = opciones.canvas || document.createElement('canvas');
  lienzo.width = ANCHO; lienzo.height = ALTO;
  const ctx = lienzo.getContext('2d');

  await esperarTipografias();

  let img = null, fallo = false;
  if (memoria.foto) {
    try { img = await cargarFoto(memoria.foto); }
    /* Que la memoria no tenga foto y que la foto no se haya podido leer son
       dos cosas distintas, y mezclarlas hacía que una memoria sin fotografía
       avisara "no se pudo incluir la fotografía" — un error inventado sobre
       algo que nunca existió. */
    catch (e) { img = null; fallo = true; }
  }

  const comp = componer({
    titulo: memoria.titulo,
    fecha: memoria.fecha,
    lugar: memoria.lugar,
    foto: img ? { ancho: img.naturalWidth, alto: img.naturalHeight } : null,
  }, (t, tam) => { ctx.font = fuente(tam, 500); return ctx.measureText(t).width; }, opciones);

  fondo(ctx);
  for (const b of comp.bloques) {
    if (b.tipo === 'marca') marca(ctx, b);
    else if (b.tipo === 'foto') foto(ctx, b, img);
    else if (b.tipo === 'sobretitulo') sobretitulo(ctx, b);
    else if (b.tipo === 'titulo') titulo(ctx, b);
    else if (b.tipo === 'lugar') lugar(ctx, b);
    else if (b.tipo === 'pie') pie(ctx, b);
  }
  return { canvas: lienzo, composicion: comp, conFoto: !!img, fallo };
}

export { ANCHO, ALTO, CAJA, comoSeLeeLaFecha };
