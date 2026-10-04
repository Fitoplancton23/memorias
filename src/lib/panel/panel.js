/* La lógica del panel de carga.
   -------------------------------------------------------------------------
   Tres pantallas: ingreso, bandeja y el asistente. El asistente es un paso por
   vez sobre un único objeto `borrador`, y recién al final se escribe en la
   base. Esto importa: hasta el último botón no hay ninguna fila a medio hacer
   dando vueltas, así que cerrar la pestaña en el paso cuatro no ensucia nada.

   La excepción son los lugares, las personas y los acontecimientos nuevos: se
   crean en el momento, porque son entidades propias que valen por sí mismas y
   que la próxima memoria va a reutilizar. Un lugar creado y una memoria
   abandonada no es basura, es un lugar.                                      */

import * as api from './api.js';
import { parseFecha } from '../../../scripts/fechas.mjs';
import { aLatLon } from '../proyeccion.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const ver = (el, si) => el && (el.hidden = !si);

/* Los pasos, en orden. `omitible` marca los que tienen botón de saltear:
   todos menos el título y la revisión final. */
const PASOS = [
  { id: 'foto',     titulo: 'La foto' },
  { id: 'que',      titulo: 'Qué pasó' },
  { id: 'cuando',   titulo: 'Cuándo' },
  { id: 'donde',    titulo: 'Dónde' },
  { id: 'quienes',  titulo: 'Quiénes' },
  { id: 'vinculos', titulo: 'Vínculos' },
  { id: 'origen',   titulo: 'Quién la aportó' },
  { id: 'revisar',  titulo: 'Revisar' },
];

let paso = 0;
let borrador = vacio();
let cacheLugares = [], cachePersonas = [], cacheAconts = [], cacheAlias = {};
let mapas = null, mapaActual = null;
/* Quién entró. Hace falta para no ofrecerle acciones que la base le va a
   rechazar: cargar y aprobar son dos permisos distintos. */
let quienSoy = null;

function vacio() {
  return {
    foto: null, fotoPrevia: null, sinFoto: false,
    titulo: '', descripcion: '',
    fechaTexto: '',
    lugar: null,
    personas: [],          /* { id, nombre, apellido, confianza, nueva } */
    pareja: false,
    acontecimiento: null,
    aportante: '', fuente: '', permiso: false,
  };
}

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */

export async function arrancar() {
  if (!api.configurado) { ver($('#sinconfig'), true); return; }

  $('#formIngreso').addEventListener('submit', alEntrar);
  $('#salir').addEventListener('click', () => { api.salir(); location.reload(); });
  $('#nueva').addEventListener('click', abrirAsistente);
  $('#atras').addEventListener('click', () => irA(paso - 1));
  $('#siguiente').addEventListener('click', alSiguiente);
  $$('[data-saltear]').forEach(b => b.addEventListener('click', saltear));
  $$('.filtro').forEach(b => b.addEventListener('click', () => {
    $$('.filtro').forEach(x => x.classList.toggle('activo', x === b));
    cargarBandeja(b.dataset.estado);
  }));
  $('#publicar').addEventListener('click', alPublicar);

  cablearFoto();
  cablearFecha();
  cablearLugar();
  cablearPersonas();
  cablearAcontecimientos();

  if (api.haySesion()) await entrarAlPanel();
  else ver($('#ingreso'), true);
}

async function alEntrar(e) {
  e.preventDefault();
  const b = e.target.querySelector('button');
  const err = $('#errIngreso');
  ver(err, false);
  b.disabled = true; b.textContent = 'Entrando…';
  try {
    await api.entrar($('#email').value.trim(), $('#clave').value);
    ver($('#ingreso'), false);
    await entrarAlPanel();
  } catch (x) {
    err.textContent = x.message; ver(err, true);
  } finally {
    b.disabled = false; b.textContent = 'Entrar';
  }
}

async function entrarAlPanel() {
  const admin = await api.soyAdmin();
  quienSoy = admin;
  $('#quien').textContent = admin?.nombre || api.correo();
  ver($('#salir'), true);

  if (!admin) {
    ver($('#ingreso'), true);
    const err = $('#errIngreso');
    err.textContent = 'Esta cuenta existe pero todavía no está habilitada para cargar. '
                    + 'Hay que darla de alta como administradora.';
    ver(err, true);
    return;
  }
  ver($('#zonaPublicar'), !!admin.puede_publicar);
  ver($('#bandeja'), true);
  await Promise.all([precargar(), cargarBandeja('pendiente')]);
}

/* Las tablas de referencia se bajan una vez y se buscan en memoria. Son pocos
   cientos de filas: traerlas de una es más rápido y mucho más tolerante con
   una conexión mala que una consulta por cada tecla. */
async function precargar() {
  const [lug, per, ali, aco] = await Promise.all([
    api.traer('lugares', 'select=id,slug,nombre,tipo&order=nombre'),
    api.traer('personas', 'select=id,slug,nombre,apellido,apodo&order=apellido'),
    api.traer('persona_alias', 'select=persona_id,alias').catch(() => []),
    api.traer('acontecimientos', 'select=id,slug,nombre,anio&order=nombre').catch(() => []),
  ]);
  cacheLugares = lug; cachePersonas = per; cacheAconts = aco;
  cacheAlias = {};
  for (const a of ali) (cacheAlias[a.persona_id] ||= []).push(a.alias);
}

/* ------------------------------------------------------------------ */
/* Bandeja                                                             */
/* ------------------------------------------------------------------ */

async function cargarBandeja(estado) {
  const lista = $('#lista'), err = $('#errBandeja');
  ver(err, false);
  lista.innerHTML = '';
  try {
    const filas = await api.traer('memorias',
      `select=id,slug,titulo,fecha_texto,anio,foto_url,estado&estado=eq.${estado}` +
      '&order=creada_en.desc.nullslast&limit=200');
    ver($('#vacio'), filas.length === 0);
    $('#vacio').textContent = estado === 'pendiente'
      ? 'No hay memorias esperando revisión.'
      : 'Todavía no hay memorias publicadas.';

    /* Sin esto, quien no aprueba ve una lista que nunca se vacía y ninguna
       explicación de por qué. */
    const nota = $('#notaBandeja');
    const soloCarga = estado === 'pendiente' && filas.length && !quienSoy?.puede_publicar;
    if (nota) {
      nota.textContent = soloCarga
        ? 'Estas memorias quedan esperando revisión. Las publica quien tiene esa tarea a cargo.'
        : '';
      ver(nota, !!soloCarga);
    }

    for (const m of filas) {
      const li = document.createElement('li');
      const img = m.foto_url
        ? Object.assign(document.createElement('img'), { src: m.foto_url, alt: '', loading: 'lazy' })
        : Object.assign(document.createElement('div'), { className: 'sinfoto' });
      const txt = document.createElement('div');
      txt.className = 'crece';
      txt.innerHTML = '<b></b><small></small>';
      txt.querySelector('b').textContent = m.titulo || '(sin título)';
      txt.querySelector('small').textContent =
        [m.fecha_texto || (m.anio ?? 'sin fecha')].join(' · ');
      li.append(img, txt);

      /* Aprobar se ofrece sólo a quien puede. Mostrar el botón y que la base
         lo rechace después es peor que no mostrarlo: quien carga se queda
         creyendo que hizo algo mal, cuando lo que pasa es que ese trabajo no
         es suyo. */
      if (estado === 'pendiente' && quienSoy?.puede_publicar) {
        const ok = document.createElement('button');
        ok.className = 'enlace';
        ok.textContent = 'Publicar';
        ok.addEventListener('click', async () => {
          ok.disabled = true; ok.textContent = 'Publicando…';
          try {
            await api.actualizar('memorias', m.id, { estado: 'aprobada' });
            li.remove();
          } catch (x) {
            ok.disabled = false; ok.textContent = 'Publicar';
            err.textContent = x.message; ver(err, true);
          }
        });
        li.append(ok);
      }
      lista.append(li);
    }
  } catch (x) {
    err.textContent = x.message; ver(err, true);
  }
}

/* El pedido a Cloudflare sale recién cuando la transacción de la base
   termina, así que publicar_sitio() no puede saber si lo aceptaron. Por eso
   después se pregunta cómo salió: sin eso, una dirección de publicación mal
   escrita falla en silencio y el profe queda esperando algo que nunca
   arrancó, que es la peor forma de fallar. */
async function alPublicar() {
  const b = $('#publicar'), err = $('#errBandeja'), aviso = $('#avisoPublicar');
  ver(err, false);
  b.disabled = true; b.textContent = 'Publicando…';
  try {
    await api.publicar();
    aviso.textContent = 'Pedido enviado. El sitio tarda un minuto o dos en reconstruirse.';
    ver(aviso, true);

    /* Seis segundos alcanzan: lo que se está comprobando es si Cloudflare
       aceptó el pedido, no si el build terminó. */
    setTimeout(async () => {
      try {
        const e = await api.estadoPublicacion();
        if (e.estado === 'ok') {
          aviso.textContent = 'Cloudflare aceptó el pedido. El sitio se está reconstruyendo.';
        } else if (e.estado === 'error') {
          ver(aviso, false);
          err.textContent = e.mensaje || 'La publicación no arrancó.'; ver(err, true);
        }
        /* en_curso: se deja el aviso como está; no hay nada malo que informar */
      } catch { /* preguntar cómo salió no puede romper nada */ }
      b.disabled = false; b.textContent = 'Publicar';
    }, 6000);
  } catch (x) {
    b.disabled = false; b.textContent = 'Publicar';
    ver(aviso, false);
    err.textContent = x.message; ver(err, true);
  }
}

/* ------------------------------------------------------------------ */
/* El asistente                                                        */
/* ------------------------------------------------------------------ */

function abrirAsistente() {
  borrador = vacio();
  paso = 0;
  limpiarFormulario();
  ver($('#bandeja'), false);
  ver($('#asistente'), true);
  pintarPasos();
  irA(0);
}

function limpiarFormulario() {
  for (const id of ['titulo', 'descripcion', 'fecha', 'buscarLugar', 'nuevoLugar',
                    'nuevoLugarTipo', 'coords', 'buscarPersona', 'buscarAcont',
                    'nuevoAcont', 'aportante', 'fuente'])
    if ($('#' + id)) $('#' + id).value = '';
  $('#permiso').checked = false;
  $('#esPareja').checked = false;
  $('#archivo').value = '';
  ver($('#previa'), false);
  ver($('#pesoFoto'), false);
  $('#soltarTexto').hidden = false;
  ver($('#lugarElegido'), false);
  ver($('#acontElegido'), false);
  $('#fichasPersonas').innerHTML = '';
  $('#lecturaFecha').textContent = '';
  ver($('#errGuardar'), false);
  ver($('#listo'), false);
}

function pintarPasos() {
  $('#pasos').innerHTML = PASOS.map(() => '<span></span>').join('');
}

function irA(n) {
  if (n < 0) { volverABandeja(); return; }
  if (n >= PASOS.length) return;
  paso = n;
  $$('.paso').forEach(s => ver(s, s.dataset.paso === PASOS[n].id));
  $$('#pasos span').forEach((s, i) => {
    s.classList.toggle('hecho', i < n);
    s.classList.toggle('actual', i === n);
  });
  $('#cuenta').textContent = `${n + 1} de ${PASOS.length} · ${PASOS[n].titulo}`;
  $('#atras').textContent = n === 0 ? 'Cancelar' : 'Atrás';
  $('#siguiente').textContent = n === PASOS.length - 1 ? 'Guardar la memoria' : 'Siguiente';
  if (PASOS[n].id === 'vinculos') prepararVinculos();
  if (PASOS[n].id === 'revisar') pintarResumen();
  scrollTo({ top: 0, behavior: 'smooth' });
}

function volverABandeja() {
  ver($('#asistente'), false);
  ver($('#bandeja'), true);
  cargarBandeja($('.filtro.activo').dataset.estado);
}

function saltear() {
  const id = PASOS[paso].id;
  if (id === 'foto') { borrador.sinFoto = true; borrador.foto = null; }
  if (id === 'cuando') { borrador.fechaTexto = ''; $('#fecha').value = ''; }
  if (id === 'donde') { borrador.lugar = null; ver($('#lugarElegido'), false); }
  if (id === 'quienes') { borrador.personas = []; $('#fichasPersonas').innerHTML = ''; }
  irA(paso + 1);
}

async function alSiguiente() {
  const id = PASOS[paso].id;

  if (id === 'que') {
    borrador.titulo = $('#titulo').value.trim();
    borrador.descripcion = $('#descripcion').value.trim();
    if (!borrador.titulo) {
      $('#titulo').focus();
      $('#titulo').setAttribute('aria-invalid', 'true');
      return;                       /* lo único que no se puede saltear */
    }
    $('#titulo').removeAttribute('aria-invalid');
  }
  if (id === 'cuando') borrador.fechaTexto = $('#fecha').value.trim();
  if (id === 'vinculos') borrador.pareja = $('#esPareja').checked;
  if (id === 'origen') {
    borrador.aportante = $('#aportante').value.trim();
    borrador.fuente = $('#fuente').value.trim();
    borrador.permiso = $('#permiso').checked;
  }
  if (id === 'revisar') { await guardar(); return; }

  irA(paso + 1);
}

/* ------------------------------------------------------------------ */
/* Paso 1 · la foto                                                    */
/* ------------------------------------------------------------------ */

function cablearFoto() {
  const zona = $('#soltar'), input = $('#archivo');
  zona.addEventListener('click', e => { if (e.target !== input) input.click(); });
  input.addEventListener('change', () => input.files[0] && tomarFoto(input.files[0]));
  ['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, e => {
    e.preventDefault(); zona.classList.add('encima');
  }));
  ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, e => {
    e.preventDefault(); zona.classList.remove('encima');
  }));
  zona.addEventListener('drop', e => {
    const f = e.dataTransfer?.files?.[0];
    if (f) tomarFoto(f);
  });
}

async function tomarFoto(archivo) {
  const peso = $('#pesoFoto');
  peso.textContent = 'Preparando la imagen…'; ver(peso, true);
  try {
    const r = await api.achicar(archivo);
    borrador.foto = r; borrador.sinFoto = false;
    const previa = $('#previa');
    if (borrador.fotoPrevia) URL.revokeObjectURL(borrador.fotoPrevia);
    borrador.fotoPrevia = URL.createObjectURL(r.blob);
    previa.src = borrador.fotoPrevia;
    ver(previa, true);
    $('#soltarTexto').hidden = true;
    peso.textContent = `${r.ancho}×${r.alto} · de ${mb(archivo.size)} a ${mb(r.blob.size)}. `
                     + 'Tocá la imagen para cambiarla.';
  } catch (x) {
    peso.textContent = x.message;
  }
}

const mb = b => b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';

/* ------------------------------------------------------------------ */
/* Paso 3 · la fecha                                                   */
/* ------------------------------------------------------------------ */

function cablearFecha() {
  const campo = $('#fecha'), salida = $('#lecturaFecha');
  campo.addEventListener('input', () => {
    const t = campo.value.trim();
    salida.className = 'lectura';
    if (!t) { salida.textContent = ''; return; }
    const f = parseFecha(t);
    if (f.precision === 'desconocida') {
      salida.classList.add('duda');
      salida.textContent = SIN_FECHA.test(t.toLowerCase())
        ? 'Queda sin fecha, y está bien: el sitio lo muestra como un dato que falta.'
        : 'No se entendió. Mirá abajo cómo se puede escribir — o dejalo sin fecha.';
      return;
    }
    salida.classList.add(f.aviso ? 'duda' : 'si');
    salida.textContent = 'Se entendió: ' + legible(f) + (f.aviso ? ' — ' + f.aviso : '');
  });
}

const SIN_FECHA = /^(pendiente|sin fecha|sin dato|no se sabe|desconocid)/;

function legible(f) {
  if (f.precision === 'dia' || f.precision === 'mes') return f.texto;
  if (f.precision === 'circa') return `alrededor de ${f.ref}`;
  if (f.precision === 'decada') return `la década de ${f.ref}`;
  if (f.desde !== f.hasta) return `entre ${f.desde} y ${f.hasta}`;
  return `el año ${f.ref}`;
}

/* ------------------------------------------------------------------ */
/* Paso 4 · el lugar                                                   */
/* ------------------------------------------------------------------ */

function cablearLugar() {
  buscador($('#buscarLugar'), $('#sugLugar'),
    t => filtrar(cacheLugares, t, l => [l.nombre, l.tipo]),
    l => ({ principal: l.nombre, secundario: l.tipo || '' }),
    l => elegirLugar(l));

  $('#quitarLugar').addEventListener('click', () => {
    borrador.lugar = null;
    ver($('#lugarElegido'), false);
    $('#buscarLugar').focus();
  });

  $('#altaLugar').addEventListener('toggle', e => {
    if (e.target.open) prepararMapa();
  });
  $('#crearLugar').addEventListener('click', crearLugar);
}

function elegirLugar(l) {
  borrador.lugar = l;
  $('#lugarNombre').textContent = l.nombre;
  ver($('#lugarElegido'), true);
  $('#buscarLugar').value = '';
  $('#sugLugar').innerHTML = '';
  $('#altaLugar').open = false;
}

async function prepararMapa() {
  const lienzo = $('#mapaLienzo');
  if (lienzo.dataset.listo) return;
  lienzo.dataset.listo = '1';
  try {
    if (!mapas) mapas = (await (await fetch('/mapa/mapa.json')).json()).mapas;
    /* El casco urbano: es donde cae casi todo, y el ejido entero haría que
       marcar una esquina sea imposible. */
    mapaActual = mapas.find(m => m.nombre === 'casco') || mapas[0];
    lienzo.innerHTML = await (await fetch(`/mapa/${mapaActual.nombre}.svg`)).text();
    const svg = lienzo.querySelector('svg');
    if (svg) {
      svg.removeAttribute('width'); svg.removeAttribute('height');
      /* El recuadro toma la proporción del mapa. Con un cuadrado fijo el
         dibujo se recorta, y el punto que marca el profe cae en otro lado:
         la conversión a latitud y longitud supone que se ve el mapa entero. */
      const [vx, vy] = mapaActual.viewBox;
      lienzo.style.setProperty('--prop', vx + ' / ' + vy);
    }
    /* La posición se mide contra el sistema de coordenadas del propio svg y
       no contra el recuadro que lo contiene. Un svg se centra adentro de su
       caja cuando las proporciones no coinciden, y entonces las dos franjas
       vacías corren la cuenta: el profe marca la terminal y el punto queda
       a cien metros. getScreenCTM da la transformación real, incluido ese
       centrado, así que la inversa acierta siempre.                        */
    lienzo.addEventListener('click', e => {
      const svg = lienzo.querySelector('svg');
      if (!svg) return;
      const [vx, vy] = mapaActual.viewBox;
      const punto = new DOMPoint(e.clientX, e.clientY)
        .matrixTransform(svg.getScreenCTM().inverse());
      const x = punto.x / vx, y = punto.y / vy;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;   /* clic en el margen */
      const { lat, lon } = aLatLon(x, y, mapaActual);
      $('#coords').value = lat.toFixed(6) + ', ' + lon.toFixed(6);
      let pin = lienzo.querySelector('.pin');
      if (!pin) { pin = document.createElement('div'); pin.className = 'pin'; lienzo.append(pin); }
      const caja = svg.getBoundingClientRect(), base = lienzo.getBoundingClientRect();
      pin.style.left = (caja.left - base.left + x * caja.width) + 'px';
      pin.style.top  = (caja.top - base.top + y * caja.height) + 'px';
    });
  } catch {
    lienzo.innerHTML = '<p class="ayuda" style="padding:1rem">No se pudo cargar el mapa. '
                     + 'Podés pegar las coordenadas a mano.</p>';
  }
}

async function crearLugar() {
  const b = $('#crearLugar');
  const nombre = $('#nuevoLugar').value.trim();
  if (!nombre) { $('#nuevoLugar').focus(); return; }

  let lat = null, lng = null;
  const c = $('#coords').value.trim();
  if (c) {
    const m = c.match(/(-?\d+[.,]?\d*)\s*[,;\s]\s*(-?\d+[.,]?\d*)/);
    if (!m) { avisar(b, 'Las coordenadas no se entienden'); return; }
    lat = parseFloat(m[1].replace(',', '.'));
    lng = parseFloat(m[2].replace(',', '.'));
  }

  b.disabled = true; b.textContent = 'Creando…';
  try {
    const fila = await api.insertar('lugares', {
      slug: unico(api.codigo(nombre), cacheLugares),
      nombre, tipo: $('#nuevoLugarTipo').value.trim() || null,
      lat, lng, es_demo: false,
    });
    cacheLugares.push(fila);
    elegirLugar(fila);
    $('#nuevoLugar').value = ''; $('#nuevoLugarTipo').value = ''; $('#coords').value = '';
    $('#mapaLienzo').querySelector('.pin')?.remove();
  } catch (x) {
    avisar(b, x.message);
  } finally {
    b.disabled = false; b.textContent = 'Crear el lugar';
  }
}

/* ------------------------------------------------------------------ */
/* Paso 5 · las personas                                               */
/* ------------------------------------------------------------------ */

function cablearPersonas() {
  const campo = $('#buscarPersona');
  buscador(campo, $('#sugPersona'),
    t => {
      const hallados = filtrar(cachePersonas, t,
        p => [p.nombre, p.apellido, p.apodo, ...(cacheAlias[p.id] || [])])
        .filter(p => !borrador.personas.some(x => x.id === p.id));
      /* La alta rápida va como una opción más de la lista, no como un
         formulario aparte: es el gesto que decide si una foto con ocho
         personas nuevas se carga o se abandona. */
      return [...hallados.slice(0, 8), { nueva: true, texto: t }];
    },
    p => p.nueva
      ? { principal: `Crear a «${p.texto}»`, secundario: 'nueva persona' }
      : { principal: [p.nombre, p.apellido].filter(Boolean).join(' '),
          secundario: p.apodo || (cacheAlias[p.id] || []).join(', ') },
    p => p.nueva ? crearPersona(p.texto) : sumarPersona(p));
}

async function crearPersona(texto) {
  const t = (texto || '').trim();
  if (!t) return;
  const partes = t.split(/\s+/);
  /* Partir en nombre y apellido es una heurística, no una verdad. Se parte por
     la última palabra, que acierta casi siempre, y queda editable después. */
  const apellido = partes.length > 1 ? partes.pop() : '';
  const nombre = partes.join(' ');
  try {
    const fila = await api.insertar('personas', {
      slug: unico(api.codigo(t), cachePersonas),
      nombre, apellido: apellido || null, es_demo: false,
      /* vive se deja sin dato a propósito: el sitio presume viva a quien no
         tiene fecha y le oculta fechas y notas. Mentir acá es lo único que
         podría publicar el dato de alguien vivo. */
    });
    cachePersonas.push(fila);
    sumarPersona({ ...fila, recienCreada: true });
  } catch (x) {
    const err = $('#errBandeja');
    if (err) { err.textContent = x.message; ver(err, true); }
  }
}

function sumarPersona(p) {
  if (borrador.personas.some(x => x.id === p.id)) return;
  borrador.personas.push({
    id: p.id, nombre: p.nombre, apellido: p.apellido,
    confianza: 'confirmada', nueva: !!p.recienCreada,
  });
  $('#buscarPersona').value = '';
  $('#sugPersona').innerHTML = '';
  pintarPersonas();
}

function pintarPersonas() {
  const ul = $('#fichasPersonas');
  ul.innerHTML = '';
  for (const p of borrador.personas) {
    const li = document.createElement('li');
    const nom = document.createElement('span');
    nom.className = 'crece';
    nom.textContent = [p.nombre, p.apellido].filter(Boolean).join(' ');
    li.append(nom);

    if (p.nueva) {
      const n = document.createElement('span');
      n.className = 'nueva'; n.textContent = 'nueva';
      li.append(n);
    }

    const sel = document.createElement('select');
    sel.innerHTML = '<option value="confirmada">segura</option>'
                  + '<option value="probable">probable</option>';
    sel.value = p.confianza;
    sel.setAttribute('aria-label', 'Qué tan segura es esta identificación');
    sel.addEventListener('change', () => { p.confianza = sel.value; });
    li.append(sel);

    const x = document.createElement('button');
    x.className = 'enlace'; x.textContent = 'sacar';
    x.addEventListener('click', () => {
      borrador.personas = borrador.personas.filter(q => q.id !== p.id);
      pintarPersonas();
    });
    li.append(x);
    ul.append(li);
  }
  ver($('#ayudaConfianza'), borrador.personas.length > 0);
}

/* ------------------------------------------------------------------ */
/* Paso 6 · vínculos                                                   */
/* ------------------------------------------------------------------ */

function prepararVinculos() {
  /* La pareja sólo se ofrece con exactamente dos personas. Con tres o más no
     hay una pareja que marcar, y ofrecerla sería invitar a inventar una. */
  const dos = borrador.personas.length === 2;
  ver($('#bloquePareja'), dos);
  if (dos) {
    const [a, b] = borrador.personas.map(p => [p.nombre, p.apellido].filter(Boolean).join(' '));
    $('#textoPareja').textContent = `${a} y ${b} fueron pareja`;
  } else {
    $('#esPareja').checked = false;
  }
}

function cablearAcontecimientos() {
  buscador($('#buscarAcont'), $('#sugAcont'),
    t => filtrar(cacheAconts, t, a => [a.nombre]),
    a => ({ principal: a.nombre, secundario: a.anio ? String(a.anio) : '' }),
    a => elegirAcont(a));

  $('#quitarAcont').addEventListener('click', () => {
    borrador.acontecimiento = null;
    ver($('#acontElegido'), false);
  });

  $('#crearAcont').addEventListener('click', async () => {
    const b = $('#crearAcont');
    const nombre = $('#nuevoAcont').value.trim();
    if (!nombre) { $('#nuevoAcont').focus(); return; }
    b.disabled = true; b.textContent = 'Creando…';
    try {
      const f = parseFecha(borrador.fechaTexto || '');
      const fila = await api.insertar('acontecimientos', {
        slug: unico(api.codigo(nombre), cacheAconts),
        nombre, anio: f.ref, anio_hasta: f.hasta, es_demo: false,
      });
      cacheAconts.push(fila);
      elegirAcont(fila);
      $('#nuevoAcont').value = '';
    } catch (x) {
      avisar(b, x.message);
    } finally {
      b.disabled = false; b.textContent = 'Crear el acontecimiento';
    }
  });
}

function elegirAcont(a) {
  borrador.acontecimiento = a;
  $('#acontNombre').textContent = a.nombre;
  ver($('#acontElegido'), true);
  $('#buscarAcont').value = '';
  $('#sugAcont').innerHTML = '';
}

/* ------------------------------------------------------------------ */
/* Paso 8 · revisar y guardar                                          */
/* ------------------------------------------------------------------ */

function pintarResumen() {
  const dl = $('#resumen');
  dl.innerHTML = '';
  const f = parseFecha(borrador.fechaTexto || '');
  const filas = [
    ['Título', borrador.titulo],
    ['Foto', borrador.foto ? `sí, ${borrador.foto.ancho}×${borrador.foto.alto}` : ''],
    ['Fecha', f.precision === 'desconocida' ? '' : legible(f)],
    ['Lugar', borrador.lugar?.nombre || ''],
    ['Personas', borrador.personas.map(p =>
      [p.nombre, p.apellido].filter(Boolean).join(' ') +
      (p.confianza === 'probable' ? ' (probable)' : '')).join(', ')],
    ['Pareja', borrador.pareja ? $('#textoPareja').textContent : ''],
    ['Acontecimiento', borrador.acontecimiento?.nombre || ''],
    ['Aportó', borrador.aportante],
  ];
  const huecos = [];
  for (const [k, v] of filas) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd');
    if (v) dd.textContent = v;
    else { dd.textContent = 'no se sabe'; dd.className = 'falta'; huecos.push(k.toLowerCase()); }
    dl.append(dt, dd);
  }
  $('#faltan').textContent = huecos.length
    ? 'Lo que falta queda marcado como que falta, no inventado. La memoria se guarda igual '
      + 'y se puede completar cuando aparezca el dato.'
    : '';
}

async function guardar() {
  const b = $('#siguiente'), err = $('#errGuardar'), listo = $('#listo');
  ver(err, false); ver(listo, false);
  b.disabled = true; b.textContent = 'Guardando…';

  try {
    /* 1 · la foto primero: si falla la subida, no queda una memoria sin ella. */
    let fotoUrl = null;
    if (borrador.foto) {
      b.textContent = 'Subiendo la foto…';
      fotoUrl = await api.subirFoto(borrador.foto.blob, api.codigo(borrador.titulo) || 'memoria');
    }

    /* 2 · la memoria. Siempre pendiente: quien carga no publica. */
    b.textContent = 'Guardando…';
    const f = parseFecha(borrador.fechaTexto || '');
    /* El código corto de la memoria se chequea contra la base, no contra una
       lista en memoria: las memorias no se precargan —son muchas y crecen— así
       que la única forma de no pisar una es preguntar. Dos fotos tituladas
       igual son más comunes de lo que parece. */
    const base = api.codigo(borrador.titulo) || 'memoria';
    const parecidos = await api.traer('memorias',
      `select=slug&slug=like.${encodeURIComponent(base)}*`).catch(() => []);

    const memoria = await api.insertar('memorias', {
      slug: unico(base, parecidos),
      titulo: borrador.titulo,
      descripcion: borrador.descripcion || null,
      fecha_texto: borrador.fechaTexto || null,
      anio: f.ref,
      anio_aprox: f.precision === 'circa' || f.precision === 'decada',
      anio_hasta: f.hasta !== f.ref ? f.hasta : null,
      precision_fecha: f.precision,
      lugar_id: borrador.lugar?.id || null,
      foto_url: fotoUrl,
      aportado_por: borrador.aportante || null,
      fuente: borrador.fuente || null,
      estado: 'pendiente',
      es_demo: false,
    });

    /* 3 · los vínculos */
    if (borrador.personas.length)
      await api.insertar('memoria_personas', borrador.personas.map(p => ({
        memoria_id: memoria.id, persona_id: p.id, confianza: p.confianza,
      })));

    if (borrador.acontecimiento)
      await api.insertar('memoria_acontecimientos', {
        memoria_id: memoria.id, acontecimiento_id: borrador.acontecimiento.id,
      });

    /* El parentesco es aparte del hecho histórico, y por eso va a su propia
       tabla: la memoria dice que estuvieron juntos, el núcleo dice que fueron
       pareja. Son dos afirmaciones distintas y el sistema no las mezcla. */
    if (borrador.pareja && borrador.personas.length === 2)
      await api.insertar('nucleos_familiares', {
        persona_a_id: borrador.personas[0].id,
        persona_b_id: borrador.personas[1].id,
        es_demo: false,
      });

    listo.textContent = 'Guardada. Queda esperando revisión; todavía no está en el sitio.';
    ver(listo, true);
    setTimeout(volverABandeja, 1400);
  } catch (x) {
    err.textContent = x.message; ver(err, true);
  } finally {
    b.disabled = false;
    b.textContent = 'Guardar la memoria';
  }
}

/* ------------------------------------------------------------------ */
/* Piezas compartidas                                                  */
/* ------------------------------------------------------------------ */

const sinTildes = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function filtrar(filas, texto, campos) {
  const t = sinTildes(texto);
  if (!t) return [];
  return filas.filter(f => campos(f).filter(Boolean).some(v => sinTildes(v).includes(t)));
}

/* Un buscador con navegación por teclado. Quien carga cien memorias trabaja
   con las manos en el teclado; obligarlo al mouse en cada nombre es lo que
   convierte la carga en una tarea insoportable. */
function buscador(campo, lista, buscar, mostrar, elegir) {
  let opciones = [], cursor = -1;

  const pintar = () => {
    lista.innerHTML = '';
    opciones.forEach((o, i) => {
      const { principal, secundario } = mostrar(o);
      const li = document.createElement('li');
      li.textContent = principal;
      li.setAttribute('aria-selected', String(i === cursor));
      if (secundario) {
        const s = document.createElement('small');
        s.textContent = secundario;
        li.append(s);
      }
      li.addEventListener('mousedown', e => { e.preventDefault(); elegir(o); });
      lista.append(li);
    });
  };

  campo.addEventListener('input', () => {
    opciones = campo.value.trim() ? buscar(campo.value.trim()) : [];
    cursor = -1;
    pintar();
  });

  campo.addEventListener('keydown', e => {
    if (!opciones.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = (cursor + 1) % opciones.length; pintar(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); cursor = (cursor - 1 + opciones.length) % opciones.length; pintar(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      elegir(opciones[cursor >= 0 ? cursor : 0]);
      opciones = []; pintar();
    }
    if (e.key === 'Escape') { opciones = []; pintar(); }
  });

  campo.addEventListener('blur', () => setTimeout(() => { opciones = []; pintar(); }, 150));
}

/* El código corto no se repite nunca: si ya existe, se le suma un número. Una
   vez usado no se cambia, así que es la única oportunidad de hacerlo bien. */
function unico(base, existentes) {
  const usados = new Set(existentes.map(x => x.slug));
  if (!base) base = 'sin-nombre';
  if (!usados.has(base)) return base;
  for (let i = 2; ; i++) if (!usados.has(`${base}-${i}`)) return `${base}-${i}`;
}

function avisar(boton, texto) {
  const p = document.createElement('p');
  p.className = 'error';
  p.textContent = texto;
  boton.after(p);
  setTimeout(() => p.remove(), 6000);
}
