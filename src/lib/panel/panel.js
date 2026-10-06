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
import { montarSelector, leerCoordenadas } from './selector-mapa.js';

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
  { id: 'punto',    titulo: 'Dónde exactamente' },
  { id: 'quienes',  titulo: 'Quiénes' },
  { id: 'vinculos', titulo: 'Vínculos' },
  { id: 'origen',   titulo: 'Quién la aportó' },
  { id: 'revisar',  titulo: 'Revisar' },
];

let paso = 0;
let borrador = vacio();
let cacheLugares = [], cachePersonas = [], cacheAconts = [], cacheAlias = {};
let selLugar = null, selPunto = null;
/* Quién entró. Hace falta para no ofrecerle acciones que la base le va a
   rechazar: cargar y aprobar son dos permisos distintos. */
let quienSoy = null;

function vacio() {
  return {
    fotos: [],              /* { blob, ancho, alto, previa, pesoOriginal } */
    sinFoto: false,
    titulo: '', descripcion: '',
    fechaTexto: '',
    lugar: null,
    punto: null,            /* { lat, lng } dentro del lugar, más preciso que él */
    precisionPunto: 'exacta',
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
  if (!api.configurado) {
    const d = $('#faltanVars');
    if (d) d.textContent = api.faltan.join(' y ');
    ver($('#sinconfig'), true);
    return;
  }

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
  else mostrarIngreso();
}

/* La puerta ocupa la pantalla entera: sin barra arriba, que ahí no tiene nada
   que ofrecer todavía. */
function mostrarIngreso() {
  ver($('#barra'), false);
  ver($('#ingreso'), true);
  prepararEntrada();
}

/* La entrada del isotipo: de dónde sale y cuánto se agranda.
   Se mide en vez de estimarse porque el punto de llegada depende del ancho de
   la pantalla y del largo del nombre, y un número puesto a ojo deja el isotipo
   corrido apenas cambia cualquiera de los dos. */
function prepararEntrada() {
  const puerta = document.getElementById('ingreso');
  const iso = puerta?.querySelector('.ingreso-marca .isotipo');
  if (!iso || puerta.dataset.entrada) return;
  puerta.dataset.entrada = '1';

  const r = iso.getBoundingClientRect();
  /* El tamaño de partida sale del alto de la pantalla, como en la pantalla de
     carga del sitio, y se acota para que no desborde en una ventana angosta. */
  const grande = Math.min(innerHeight * .26, innerWidth * .4, 190);
  const k = grande / r.width;
  const dx = (innerWidth / 2) - (r.left + r.width / 2);
  const dy = (innerHeight / 2) - (r.top + r.height / 2);

  iso.style.setProperty('--dx', dx.toFixed(1) + 'px');
  iso.style.setProperty('--dy', dy.toFixed(1) + 'px');
  iso.style.setProperty('--k', k.toFixed(3));
  puerta.classList.add('entra');
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
    ver($('#barra'), true);
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
    mostrarIngreso();
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
    /* Lo último cargado primero. El orden se pide aparte y con red: si la base
       todavía no tiene la columna de fecha de carga —db/15_fecha_de_carga.sql—
       la lista sale desordenada en vez de salir rota. Una bandeja sin orden es
       un inconveniente; una bandeja que no carga es una pared. */
    const base = `select=id,slug,titulo,fecha_texto,anio,foto_url,estado&estado=eq.${estado}&limit=200`;
    const filas = await api.traer('memorias', base + '&order=creada_en.desc')
      .catch(() => api.traer('memorias', base));
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
            await aprobarMemoria(m.id);
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
/* Aprobar una memoria aprueba también a las personas que nombra. Los dos
   movimientos van juntos y no por prolijidad: si se filtran las personas sin
   esto, una memoria aprobada mostraría menos gente de la que tiene, y el
   archivo estaría escondiendo parte de lo que dice saber.

   Las personas se aprueban primero. Si algo falla en el medio, queda una
   persona visible sin su memoria —que no dice nada de nadie— en vez de una
   memoria publicada con gente que el sitio no va a mostrar. */
async function aprobarMemoria(id) {
  /* Sin red de por medio: si algo de esto falla, tiene que fallar la aprobación
     entera. Tragarse el error —que fue mi primera versión— deja a una persona
     escondida con su memoria publicada, que es exactamente lo contrario de lo
     que el orden pretende garantizar. Al propagarse, la memoria queda
     pendiente, el panel lo dice, y el botón vuelve a estar disponible.

     Reaprobar a alguien ya aprobado no es un error: la base acepta el update
     igual, así que no hace falta distinguir el caso. */
  const vinculos = await api.traer('memoria_personas',
    `select=persona_id&memoria_id=eq.${encodeURIComponent(id)}`);
  for (const v of vinculos) {
    await api.actualizar('personas', v.persona_id, { estado: 'aprobada' });
  }
  await api.actualizar('memorias', id, { estado: 'aprobada' });
}

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
  /* Las vistas previas son URLs de objeto: si no se liberan, cada memoria
     cargada deja sus fotos en memoria hasta que se recargue la página. */
  for (const x of borrador.fotos || []) URL.revokeObjectURL(x.previa);
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
  ver($('#pesoFoto'), false);
  $('#fotos').innerHTML = '';
  $('#soltarTexto').textContent = 'Elegir imágenes, o arrastrarlas acá';
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
  if (PASOS[n].id === 'punto') prepararPunto();
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
  if (id === 'foto') {
    for (const f of borrador.fotos) URL.revokeObjectURL(f.previa);
    borrador.sinFoto = true; borrador.fotos = [];
    $("#fotos").innerHTML = ""; ver($("#pesoFoto"), false);
  }
  if (id === 'cuando') { borrador.fechaTexto = ''; $('#fecha').value = ''; }
  if (id === 'donde') { borrador.lugar = null; ver($('#lugarElegido'), false); }
  if (id === 'punto') {
    borrador.punto = null; borrador.precisionPunto = null;
    selPunto?.marcar(null); $('#coordsPunto').textContent = '';
    ver($('#precisionPunto'), false);
  }
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
  input.addEventListener('change', () => {
    tomarFotos([...input.files]);
    /* Se limpia para que elegir el mismo archivo otra vez vuelva a disparar
       el evento: sin esto, agregar y sacar la misma foto deja de funcionar. */
    input.value = '';
  });
  ['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, e => {
    e.preventDefault(); zona.classList.add('encima');
  }));
  ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, e => {
    e.preventDefault(); zona.classList.remove('encima');
  }));
  zona.addEventListener('drop', e => tomarFotos([...(e.dataTransfer?.files || [])]));
}

/* Se achican de a una y no todas juntas: cinco fotos de celular en paralelo
   son cinco lienzos grandes vivos a la vez, y en una máquina modesta eso es
   justo donde el navegador se cae. De a una tarda lo mismo y no arriesga. */
async function tomarFotos(archivos) {
  const imagenes = archivos.filter(f => f.type.startsWith('image/'));
  if (!imagenes.length) return;

  const peso = $('#pesoFoto');
  ver(peso, true);
  borrador.sinFoto = false;

  let ahorrado = 0, original = 0;
  for (const [n, archivo] of imagenes.entries()) {
    peso.textContent = imagenes.length > 1
      ? `Preparando ${n + 1} de ${imagenes.length}…` : 'Preparando la imagen…';
    try {
      const r = await api.achicar(archivo);
      borrador.fotos.push({ ...r, previa: URL.createObjectURL(r.blob), pesoOriginal: archivo.size });
      original += archivo.size; ahorrado += r.blob.size;
      pintarFotos();
    } catch {
      /* Una imagen rota no puede frenar a las otras cuatro. */
      peso.textContent = `No se pudo leer «${archivo.name}». ¿Es un archivo de foto?`;
    }
  }

  if (borrador.fotos.length) {
    peso.textContent = `${borrador.fotos.length} ${borrador.fotos.length === 1 ? 'foto' : 'fotos'}`
      + ` · de ${mb(original)} a ${mb(ahorrado)}`
      + (borrador.fotos.length > 1 ? '. La primera es la portada.' : '.');
  }
}

function pintarFotos() {
  const ul = $('#fotos');
  ul.innerHTML = '';
  borrador.fotos.forEach((f, n) => {
    const li = document.createElement('li');

    const img = document.createElement('img');
    img.src = f.previa; img.alt = '';
    li.append(img);

    if (n === 0 && borrador.fotos.length > 1) {
      const cinta = document.createElement('span');
      cinta.className = 'cinta'; cinta.textContent = 'portada';
      li.append(cinta);
    }

    const mandos = document.createElement('div');
    mandos.className = 'mandos';

    const portada = document.createElement('button');
    portada.type = 'button';
    portada.textContent = n === 0 ? 'es la portada' : 'hacer portada';
    portada.disabled = n === 0;
    portada.addEventListener('click', () => {
      /* Mover al frente en vez de intercambiar: el resto conserva su orden,
         que es el que eligió quien las subió. */
      borrador.fotos.unshift(borrador.fotos.splice(n, 1)[0]);
      pintarFotos();
    });

    const sacar = document.createElement('button');
    sacar.type = 'button'; sacar.textContent = 'sacar';
    sacar.addEventListener('click', () => {
      URL.revokeObjectURL(borrador.fotos[n].previa);
      borrador.fotos.splice(n, 1);
      pintarFotos();
      if (!borrador.fotos.length) { $('#pesoFoto').textContent = ''; ver($('#pesoFoto'), false); }
    });

    mandos.append(portada, sacar);
    li.append(mandos);
    ul.append(li);
  });

  /* El recuadro de soltar sigue existiendo para sumar más, pero cambia de
     texto: ya no es "elegir", es "agregar". */
  $('#soltarTexto').textContent = borrador.fotos.length
    ? 'Agregar más imágenes, o arrastrarlas acá'
    : 'Elegir imágenes, o arrastrarlas acá';
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
  const caja = $('#mapaLienzo');
  if (caja.dataset.listo) return;
  caja.dataset.listo = '1';
  try {
    selLugar = await montarSelector(caja, {
      onElegir: (lat, lng) => {
        $('#coords').value = lat.toFixed(6) + ', ' + lng.toFixed(6);
        $('#escalaLugar').textContent = escala(caja, selLugar.mapa);
      },
    });
    $('#escalaLugar').textContent = escala(caja, selLugar.mapa);
    caja.addEventListener('wheel', () =>
      requestAnimationFrame(() => { $('#escalaLugar').textContent = escala(caja, selLugar.mapa); }),
      { passive: true });
    $('#verTodoLugar').addEventListener('click', () => {
      selLugar.verTodo();
      $('#escalaLugar').textContent = escala(caja, selLugar.mapa);
    });
  } catch {
    caja.innerHTML = '<p class="ayuda" style="padding:1rem">No se pudo cargar el mapa. '
                   + 'Podés pegar las coordenadas a mano.</p>';
  }
}

/* Cuánto mide un píxel en metros, al acercamiento actual. Es el dato que le
   dice al admin si lo que está marcando puede distinguir un patio de un salón
   o si todavía está marcando "la manzana". Sin eso, acercarse es a ciegas. */
function escala(caja, mapa) {
  const k = +(caja.dataset.aumentos || 1);
  const [minlat, minlon, , maxlon] = mapa.bounds;
  const anchoM = (maxlon - minlon) * 111320 * Math.cos(minlat * Math.PI / 180);
  const px = caja.getBoundingClientRect().width * k;
  if (!px) return '';
  const m = anchoM / px;
  return m < 1 ? `${Math.round(m * 100)} cm por píxel` : `${m.toFixed(1)} m por píxel`;
}

/* ------------------------------------------------------------------ */
/* Paso 4b · el punto exacto                                           */
/* ------------------------------------------------------------------ */

async function prepararPunto() {
  const caja = $('#mapaPunto');

  /* El texto cambia según haya lugar o no, porque son dos preguntas
     distintas: "dónde dentro de la escuela" y "dónde fue esto". */
  $('#puntoAyuda').textContent = borrador.lugar
    ? 'El patio y el salón de actos son dos puntos dentro de la misma escuela, '
      + 'y no son dos lugares. Acercá el mapa y marcá dónde se tomó la foto.'
    : 'No elegiste un lugar, pero si sabés dónde fue, marcalo igual. '
      + 'Reconocer la esquina sin saber de quién era la casa también es un dato.';

  $$('#precisionPunto input').forEach(r => r.addEventListener('change', () => {
    borrador.precisionPunto = $('#precisionPunto input:checked').value;
  }));

  if (caja.dataset.listo) return;
  caja.dataset.listo = '1';

  const refiere = borrador.lugar?.lat != null
    ? { lat: borrador.lugar.lat, lng: borrador.lugar.lng, nombre: borrador.lugar.nombre }
    : null;

  try {
    selPunto = await montarSelector(caja, {
      referencia: refiere,
      /* Arrancar acercado sobre el lugar: si el mapa abre entero, el admin
         tiene que encontrar la escuela de nuevo cada vez. */
      acercar: refiere ? 16 : 1,
      onElegir: (lat, lng) => {
        borrador.punto = { lat, lng };
        $('#coordsPunto').textContent = `${lat.toFixed(7)}, ${lng.toFixed(7)}`
          + ' · ' + escala(caja, selPunto.mapa);
        ver($('#precisionPunto'), true);
      },
    });
    const refrescar = () => { $('#escalaPunto').textContent = escala(caja, selPunto.mapa); };
    refrescar();
    caja.addEventListener('wheel', () => requestAnimationFrame(refrescar), { passive: true });
    $('#verTodoPunto').addEventListener('click', () => { selPunto.verTodo(); refrescar(); });
  } catch {
    caja.innerHTML = '<p class="ayuda" style="padding:1rem">No se pudo cargar el mapa.</p>';
  }
}

async function crearLugar() {
  const b = $('#crearLugar');
  const nombre = $('#nuevoLugar').value.trim();
  if (!nombre) { $('#nuevoLugar').focus(); return; }

  let lat = null, lng = null;
  const texto = $('#coords').value.trim();
  if (texto) {
    const p = leerCoordenadas(texto);
    if (!p) { avisar(b, 'Las coordenadas no se entienden'); return; }
    ({ lat, lng } = p);
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
      /* Pendiente, igual que la memoria. La compuerta de moderación cubría las
         memorias pero no a la gente que esas memorias nombran: una persona
         creada mientras se carga una memoria sin aprobar aparecía en el sitio
         público con su página propia antes de que nadie mirara nada. En un
         archivo de un pueblo, con gente viva, eso no puede pasar. */
      estado: 'pendiente',
      creado_por: api.quien(),
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
    ['Fotos', borrador.fotos.length
      ? `${borrador.fotos.length} ${borrador.fotos.length === 1 ? 'foto' : 'fotos'}` : ''],
    ['Fecha', f.precision === 'desconocida' ? '' : legible(f)],
    ['Lugar', borrador.lugar?.nombre || ''],
    ['Punto exacto', borrador.punto
      ? `${borrador.punto.lat.toFixed(6)}, ${borrador.punto.lng.toFixed(6)}`
        + (borrador.precisionPunto === 'aproximada' ? ' (aproximado)' : '')
      : ''],
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
    /* 1 · las fotos primero: si falla la subida, no queda una memoria sin ellas.

       Y se sube de a una guardando lo que entró: desde una conexión del pueblo,
       que falle la cuarta de cinco es lo normal, y descartar las tres buenas
       obligaría a repetir el formulario entero. Lo que entró, entró; de lo que
       no, se avisa cuál. */
    const subidas = [];
    const fallaron = [];
    const nombre = api.codigo(borrador.titulo) || 'memoria';
    for (const [n, f] of borrador.fotos.entries()) {
      b.textContent = borrador.fotos.length > 1
        ? `Subiendo ${n + 1} de ${borrador.fotos.length}…` : 'Subiendo la foto…';
      try {
        subidas.push(await api.subirFoto(f.blob, nombre));
      } catch {
        fallaron.push(n + 1);
      }
    }
    if (borrador.fotos.length && !subidas.length)
      throw new Error('No se pudo subir ninguna foto. Revisá la conexión y probá de nuevo.');

    const fotoUrl = subidas[0] || null;

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
      /* El punto va con toda la precisión que tenga. Y si no hay punto, van
         los tres campos en null: una precisión declarada sobre un punto que no
         existe sería inventar precisión. */
      lat: borrador.punto?.lat ?? null,
      lng: borrador.punto?.lng ?? null,
      precision_punto: borrador.punto ? (borrador.precisionPunto || 'exacta') : null,
      foto_url: fotoUrl,
      aportado_por: borrador.aportante || null,
      fuente: borrador.fuente || null,
      estado: 'pendiente',
      es_demo: false,
      creado_por: api.quien(),
    });

    /* 3 · los vínculos */
    if (borrador.personas.length)
      await api.insertar('memoria_personas', borrador.personas.map(p => ({
        memoria_id: memoria.id, persona_id: p.id, confianza: p.confianza,
      })));

    /* La portada va en memorias.foto_url y el resto en memoria_fotos, que es
       como ya lo lee el build: fusiona las dos y saca repetidas. El orden es
       el que se ve en el formulario. */
    if (subidas.length > 1)
      await api.insertar('memoria_fotos', subidas.slice(1).map((url, n) => ({
        memoria_id: memoria.id, url, orden: n + 1,
        /* Ya los calculó el achicado; guardarlos evita que el sitio tenga que
           medir la imagen para reservarle el lugar. */
        ancho: borrador.fotos[n + 1]?.ancho ?? null,
        alto: borrador.fotos[n + 1]?.alto ?? null,
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

    listo.textContent = 'Guardada. Queda esperando revisión; todavía no está en el sitio.'
      + (fallaron.length
          ? ` Ojo: no se ${fallaron.length === 1 ? 'pudo subir la foto' : 'pudieron subir las fotos'} `
            + `${fallaron.join(', ')}. El resto quedó guardado.`
          : '');
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
