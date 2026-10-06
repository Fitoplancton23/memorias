/* El taller: corregir personas y lugares ya cargados.
   -------------------------------------------------------------------------
   No es una cuarta puerta del archivo. Es el único lugar donde se arregla lo
   que se escribió mal, que hasta ahora era lo que seguía obligando a que
   alguien tocara SQL — justo la dependencia que el panel vino a eliminar.

   Vale para las dos entidades que el asistente crea al pasar: una persona que
   se dio de alta mientras se cargaba una foto, y un lugar que se creó para
   ubicarla. Las dos se crean apuradas, en el medio de otra tarea, que es
   exactamente cuando se escriben mal.

   Lo que no se toca: el slug. Es la dirección pública de la ficha, igual que
   en una memoria. El nombre puede cambiar todo lo que haga falta.            */

import * as api from './api.js';
import { montarSelector, leerCoordenadas } from './selector-mapa.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const ver = (el, si) => el && (el.hidden = !si);

const sinTildes = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* Cuántas filas se pintan de una. Con el buscador vacío la lista completa no
   sirve para nada —nadie lee trescientos nombres— y pintarla cuesta. */
const TOPE = 40;

let datos = null;        /* { personas, lugares, alias } vivos, de panel.js */
let refrescar = null;    /* para que panel.js vuelva a bajar sus caches */
let que = 'personas';
let abierta = null;      /* el id de la ficha abierta, para no cerrarla al repintar */

export function cablearFichero(opciones) {
  datos = opciones.datos;
  refrescar = opciones.refrescar;

  for (const t of $$('.ficha-tab')) {
    t.addEventListener('click', () => {
      $$('.ficha-tab').forEach(o => o.classList.toggle('activo', o === t));
      que = t.dataset.que;
      abierta = null;
      $('#buscarFicha').placeholder = que === 'personas'
        ? 'Buscar por nombre, apellido o apodo'
        : 'Buscar un lugar por su nombre';
      pintar();
    });
  }
  $('#buscarFicha').addEventListener('input', () => { abierta = null; pintar(); });
}

export function abrirFichero() {
  ver($('#bandeja'), false);
  ver($('#fichero'), true);
  ver($('#errFichero'), false);
  abierta = null;
  $('#buscarFicha').value = '';
  pintar();
  $('#buscarFicha').focus();
}

/* ------------------------------------------------------------------ */
/* La lista                                                            */
/* ------------------------------------------------------------------ */

function filas() {
  const t = sinTildes($('#buscarFicha').value.trim());
  const lista = que === 'personas' ? datos.personas() : datos.lugares();
  if (!t) return lista;
  const alias = datos.alias();
  return lista.filter(o => que === 'personas'
    ? [o.nombre, o.apellido, o.apodo, ...(alias[o.id] || [])]
        .filter(Boolean).some(v => sinTildes(v).includes(t))
    : [o.nombre, o.tipo].filter(Boolean).some(v => sinTildes(v).includes(t)));
}

function pintar() {
  const ul = $('#listaFichero');
  ul.innerHTML = '';
  const todas = filas();
  const muestra = todas.slice(0, TOPE);

  ver($('#vacioFichero'), todas.length === 0);
  $('#vacioFichero').textContent = $('#buscarFicha').value.trim()
    ? 'No hay nada con ese nombre.'
    : (que === 'personas' ? 'Todavía no hay personas cargadas.' : 'Todavía no hay lugares cargados.');

  /* Regla 3 también acá: la lista dice cuánto no está mostrando. Una lista
     recortada en silencio hace buscar dos veces la misma persona. */
  $('#cuentaFichero').textContent = todas.length > TOPE
    ? `Se muestran ${TOPE} de ${todas.length}. Escribí para achicar la búsqueda.`
    : todas.length ? `${todas.length} ${rotulo(todas.length)}` : '';

  for (const o of muestra) {
    const li = document.createElement('li');
    if (o.id === abierta) { li.className = 'abierta'; formulario(li, o); }
    else resumen(li, o);
    ul.append(li);
  }
}

const rotulo = n => que === 'personas'
  ? (n === 1 ? 'persona' : 'personas')
  : (n === 1 ? 'lugar' : 'lugares');

function resumen(li, o) {
  const txt = document.createElement('div');
  txt.className = 'crece';
  const b = document.createElement('b');
  const chico = document.createElement('small');

  if (que === 'personas') {
    b.textContent = [o.nombre, o.apellido].filter(Boolean).join(' ') || '(sin nombre)';
    const otros = [o.apodo, ...(datos.alias()[o.id] || [])].filter(Boolean);
    chico.textContent = otros.length ? otros.join(' · ') : '';
  } else {
    b.textContent = o.nombre || '(sin nombre)';
    /* Que un lugar no tenga coordenada no es un error: es un dato que falta, y
       se dice como lo que es. */
    chico.textContent = [o.tipo, o.lat == null ? 'sin ubicar en el mapa' : null]
      .filter(Boolean).join(' · ');
    if (o.lat == null) chico.className = 'falta';
  }
  txt.append(b, chico);

  const corregir = document.createElement('button');
  corregir.className = 'enlace';
  corregir.textContent = 'Corregir';
  corregir.addEventListener('click', () => { abierta = o.id; pintar(); });

  li.append(txt, corregir);
}

/* ------------------------------------------------------------------ */
/* El formulario                                                       */
/* ------------------------------------------------------------------ */

function campo(etiqueta, valor, extra = {}) {
  const l = document.createElement('label');
  l.textContent = etiqueta;
  const i = Object.assign(document.createElement('input'),
    { type: 'text', value: valor || '', ...extra });
  l.append(i);
  return { l, i };
}

function formulario(li, o) {
  const caja = document.createElement('div');
  caja.className = 'ficha-form';
  li.append(caja);

  const err = document.createElement('p');
  err.className = 'error'; err.hidden = true;

  const mandos = document.createElement('div');
  mandos.className = 'mandos';
  const guardar = Object.assign(document.createElement('button'), { textContent: 'Guardar' });
  const cancelar = Object.assign(document.createElement('button'),
    { className: 'enlace', textContent: 'cancelar' });
  cancelar.addEventListener('click', () => { abierta = null; pintar(); });
  mandos.append(guardar, cancelar);

  const nota = document.createElement('p');
  nota.className = 'ficha-nota';
  nota.textContent = `Dirección pública: /${que === 'personas' ? 'personas' : 'lugares'}/${o.slug || o.id}/ — no cambia.`;

  const fallar = x => {
    guardar.disabled = false; guardar.textContent = 'Guardar';
    err.textContent = x.message; ver(err, true);
  };
  const listo = async (campos, extra) => {
    guardar.disabled = true; guardar.textContent = 'Guardando…';
    ver(err, false);
    try {
      await api.actualizar(que === 'personas' ? 'personas' : 'lugares', o.id, campos);
      if (extra) await extra();
      await refrescar();
      abierta = null;
      pintar();
    } catch (x) { fallar(x); }
  };

  if (que === 'personas') formularioPersona(caja, o, guardar, listo);
  else formularioLugar(caja, o, guardar, listo);

  caja.append(err, mandos, nota);
}

function formularioPersona(caja, o, guardar, listo) {
  const par = document.createElement('div');
  par.className = 'par';
  const nombre = campo('Nombre', o.nombre);
  const apellido = campo('Apellido', o.apellido);
  par.append(nombre.l, apellido.l);

  /* Sin ejemplo. En el asistente un placeholder como "el Negro" ayuda, porque
     ahí no hay nada guardado y se entiende que es una sugerencia. Acá el
     trabajo de la pantalla es mostrar lo que hay: un ejemplo plausible en un
     campo vacío se lee como el dato de esa persona, y alguien puede terminar
     "corrigiendo" algo que nunca estuvo. */
  const apodo = campo('Apodo', o.apodo);

  /* Los alias son cómo la busca el pueblo. Van aparte del apodo porque una
     persona puede tener varios, y porque el buscador del sitio los mira a
     todos por igual. */
  const lAlias = document.createElement('label');
  lAlias.textContent = 'Otros nombres con los que se la conoce';
  const chips = document.createElement('div');
  chips.className = 'ficha-alias';
  const nuevo = Object.assign(document.createElement('input'),
    { type: 'text', placeholder: 'Sumar uno y apretar Enter' });
  lAlias.append(nuevo);

  let alias = [...(datos.alias()[o.id] || [])];
  const pintarChips = () => {
    chips.innerHTML = '';
    for (const a of alias) {
      const c = document.createElement('span');
      c.className = 'chip';
      c.append(document.createTextNode(a));
      const x = Object.assign(document.createElement('button'),
        { type: 'button', textContent: '×', title: `Sacar ${a}` });
      x.addEventListener('click', () => { alias = alias.filter(v => v !== a); pintarChips(); });
      c.append(x);
      chips.append(c);
    }
  };
  pintarChips();
  nuevo.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = nuevo.value.trim();
    if (v && !alias.includes(v)) { alias.push(v); pintarChips(); }
    nuevo.value = '';
  });

  caja.append(par, apodo.l, lAlias, chips);

  guardar.addEventListener('click', () => {
    if (!nombre.i.value.trim() && !apellido.i.value.trim()) {
      nombre.i.focus();
      return;
    }
    const antes = datos.alias()[o.id] || [];
    /* Se suma el que se agregó y se saca el que se sacó. Reemplazar la lista
       entera sería más corto, pero dejaría un hueco: entre el borrado y la
       escritura, una persona sin ninguno de sus nombres. */
    const sumar = alias.filter(a => !antes.includes(a));
    const sacar = antes.filter(a => !alias.includes(a));

    listo({
      nombre: nombre.i.value.trim() || null,
      apellido: apellido.i.value.trim() || null,
      apodo: apodo.i.value.trim() || null,
    }, async () => {
      if (sumar.length)
        await api.insertar('persona_alias', sumar.map(a => ({ persona_id: o.id, alias: a })));
      for (const a of sacar)
        await api.borrar('persona_alias',
          `persona_id=eq.${encodeURIComponent(o.id)}&alias=eq.${encodeURIComponent(a)}`);
    });
  });
}

function formularioLugar(caja, o, guardar, listo) {
  const par = document.createElement('div');
  par.className = 'par';
  const nombre = campo('Nombre', o.nombre);
  /* Éste sí lleva ejemplo: es una enumeración y no se puede confundir con el
     tipo de este lugar en particular. */
  const tipo = campo('Qué es', o.tipo, { placeholder: 'escuela, plaza, casa…' });
  par.append(nombre.l, tipo.l);
  caja.append(par);

  const lCoord = document.createElement('label');
  lCoord.textContent = 'Dónde queda';
  const coords = Object.assign(document.createElement('input'),
    { type: 'text', placeholder: 'Pegar coordenadas de Google Maps, o marcar en el mapa',
      value: o.lat == null ? '' : `${o.lat}, ${o.lng}` });
  lCoord.append(coords);
  caja.append(lCoord);

  /* `mapa-lienzo` no es decorativo: de esa clase cuelgan los colores del
     dibujo. Sin ella el SVG sale crudo —fondo negro— y sin el tope de alto de
     `mapa-grande` ocupa toda la pantalla. */
  const mapa = document.createElement('div');
  mapa.className = 'mapa-lienzo mapa-grande ficha-mapa';
  caja.append(mapa);

  /* Volver a ver el pueblo entero. Hace falta justo cuando más se necesita
     esta pantalla: si la coordenada está mal de verdad, el mapa abre acercado
     sobre un lugar equivocado y sin esto no hay forma de salir de ahí. */
  const barra = document.createElement('div');
  barra.className = 'mapa-barra';
  const verTodo = Object.assign(document.createElement('button'),
    { type: 'button', className: 'enlace', textContent: 'ver todo' });
  barra.append(verTodo);
  caja.append(barra);

  const nota = document.createElement('p');
  nota.className = 'ficha-nota';
  nota.textContent = 'La coordenada de un lugar se fija una vez y sólo cambia acá: '
    + 'nunca se recalcula sola a partir de las fotos que entran.';
  caja.append(nota);

  let punto = o.lat == null ? null : { lat: +o.lat, lng: +o.lng };
  let sel = null;
  montarSelector(mapa, {
    centro: punto,
    acercar: punto ? 10 : 1,
    /* Llega (lat, lng) sueltos, no un objeto. */
    onElegir: (lat, lng) => {
      punto = { lat, lng };
      coords.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    },
  }).then(s => {
    sel = s;
    if (punto) s.marcar(punto.lat, punto.lng);
    verTodo.addEventListener('click', () => s.verTodo());
  })
    .catch(() => { mapa.textContent = 'El mapa no se pudo dibujar. Se puede pegar la coordenada igual.'; });

  /* Pegar la coordenada de Google Maps es el camino más corto para un lugar
     que ya se buscó allá; marcar en el mapa es el que sirve para una casa que
     no tiene dirección. Los dos escriben el mismo punto. */
  coords.addEventListener('input', () => {
    const p = leerCoordenadas(coords.value);
    if (!p) return;
    punto = p;
    sel?.marcar(p.lat, p.lng);
    sel?.irA?.(p.lat, p.lng);
  });

  guardar.addEventListener('click', () => {
    if (!nombre.i.value.trim()) { nombre.i.focus(); return; }
    /* Si el campo se vacía, el lugar se queda sin ubicar — que es un estado
       válido y no un error. Borrar una coordenada equivocada es mejor que
       dejar un marcador en el lugar que no es. */
    if (!coords.value.trim()) punto = null;
    listo({
      nombre: nombre.i.value.trim(),
      tipo: tipo.i.value.trim() || null,
      lat: punto?.lat ?? null,
      lng: punto?.lng ?? null,
    });
  });
}
