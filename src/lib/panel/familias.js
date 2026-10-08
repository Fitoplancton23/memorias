/* Armar una familia.
   -------------------------------------------------------------------------
   Es la pantalla que faltaba. El panel sabía cargar memorias, personas,
   lugares y apodos, pero el parentesco —que es la mitad de lo que el sitio
   dibuja— seguía necesitando que alguien escribiera SQL a mano. Cada vez que
   una vecina aportaba «la pareja es fulano y mengana, los hijos son estos
   tres», el archivo dependía de que hubiera un programador cerca.

   Lo que se arma acá es un núcleo: una pareja —o una sola persona, que
   también es un núcleo: una madre con sus hijos lo es— y sus hijos. Eso es
   todo lo que el modelo guarda, y es todo lo que la grilla genealógica
   necesita para dibujar la pareja a la misma altura y la descendencia abajo.

   Lo que acá NO se registra es lo histórico: que dos personas aparezcan en la
   misma foto no las hace parientes, y se carga por el otro lado, con la
   memoria. Son dos cosas distintas y el panel no las mezcla.                 */

import * as api from './api.js';
import { buscador, filtrar, nombreDe, sinTildes, unico } from './piezas.js';

const UNIONES = [
  ['matrimonio', 'Matrimonio'],
  ['pareja', 'Pareja'],
  ['desconocida', 'No sabemos'],
];

let nucleos = [];     /* [{ id, persona_a_id, persona_b_id, tipo_union, anio_union, hijos: [] }] */

export const hayNucleos = () => nucleos.length;

/* Se bajan las dos tablas enteras. Son pocas filas —un pueblo tiene cientos
   de núcleos, no millones— y tenerlas juntas permite contar hijos sin una
   consulta por fila. */
export async function cargarNucleos() {
  const [ns, hs] = await Promise.all([
    api.traer('nucleos_familiares', 'select=id,persona_a_id,persona_b_id,tipo_union,anio_union'),
    api.traer('nucleo_hijos', 'select=nucleo_id,persona_id,tipo'),
  ]);
  const porId = new Map(ns.map(n => [n.id, { ...n, hijos: [] }]));
  for (const h of hs) porId.get(h.nucleo_id)?.hijos.push(h.persona_id);
  nucleos = [...porId.values()];
  return nucleos;
}

/* Las familias no tienen nombre propio: se las busca por la gente que las
   compone, que es como las nombra el pueblo —«los Signer»—. */
export function filasFamilias(datos, texto) {
  const t = sinTildes(texto || '').trim();
  const orden = (a, b) => rotulo(a, datos).localeCompare(rotulo(b, datos));
  if (!t) return [...nucleos].sort(orden);
  const alias = datos.alias();
  const calza = id => {
    const p = persona(datos, id);
    if (!p) return false;
    return [p.nombre, p.apellido, p.apodo, ...(alias[p.id] || [])]
      .filter(Boolean).some(v => sinTildes(v).includes(t));
  };
  return nucleos
    .filter(n => [n.persona_a_id, n.persona_b_id, ...n.hijos].filter(Boolean).some(calza))
    .sort(orden);
}

const persona = (datos, id) => id ? datos.personas().find(p => p.id === id) : null;

export function rotulo(n, datos) {
  const a = nombreDe(persona(datos, n.persona_a_id));
  const b = n.persona_b_id ? nombreDe(persona(datos, n.persona_b_id)) : null;
  return b ? `${a} y ${b}` : a;
}

export function resumenFamilia(li, n, datos, abrir) {
  const txt = document.createElement('div');
  txt.className = 'crece';
  const b = document.createElement('b');
  b.textContent = rotulo(n, datos);
  const chico = document.createElement('small');
  const q = n.hijos.length;
  const union = UNIONES.find(u => u[0] === n.tipo_union)?.[1] || n.tipo_union || '';
  chico.textContent = [
    union,
    n.anio_union || null,
    q ? `${q} ${q === 1 ? 'hijo' : 'hijos'}` : 'sin hijos cargados',
    n.persona_b_id ? null : 'una sola persona',
  ].filter(Boolean).join(' · ');
  if (!q) chico.className = 'falta';
  txt.append(b, chico);

  const corregir = document.createElement('button');
  corregir.className = 'enlace';
  corregir.textContent = 'Corregir';
  corregir.addEventListener('click', () => abrir(n.id));
  li.append(txt, corregir);
}

/* ------------------------------------------------------------------ */
/* Elegir una persona                                                  */
/* ------------------------------------------------------------------ */

/* El mismo gesto que en el asistente de memorias: se escribe el nombre y, si
   no está, se la crea ahí mismo. Sin eso la pantalla se traba justo donde más
   se la necesita —los hijos de una familia vieja casi nunca están cargados— y
   obliga a ir a otra pantalla, crear tres personas y volver. */
function elegirPersona(contenedor, { etiqueta, pista, excluir, datos, alElegir }) {
  const l = document.createElement('label');
  l.textContent = etiqueta;
  const campo = Object.assign(document.createElement('input'),
    { type: 'text', autocomplete: 'off', placeholder: pista || 'Buscar por nombre o apodo' });
  const sug = document.createElement('ul');
  sug.className = 'sugerencias';
  l.append(campo);
  contenedor.append(l, sug);

  const b = buscador(campo, sug,
    t => {
      const fuera = excluir();
      const hallados = filtrar(datos.personas(), t,
        p => [p.nombre, p.apellido, p.apodo, ...(datos.alias()[p.id] || [])])
        .filter(p => !fuera.includes(p.id));
      return [...hallados.slice(0, 8), { nueva: true, texto: t }];
    },
    p => p.nueva
      ? { principal: `Crear a «${p.texto}»`, secundario: 'persona nueva' }
      : { principal: nombreDe(p),
          secundario: p.apodo || (datos.alias()[p.id] || []).join(', ') },
    async p => {
      campo.value = '';
      b.limpiar();
      alElegir(p.nueva ? await crearPersona(p.texto, datos) : p);
    });
  return campo;
}

async function crearPersona(texto, datos) {
  const t = (texto || '').trim();
  if (!t) return null;
  const partes = t.split(/\s+/);
  /* Partir por la última palabra acierta casi siempre, y queda editable en el
     taller de personas. */
  const apellido = partes.length > 1 ? partes.pop() : '';
  const nombre = partes.join(' ');
  const fila = await api.insertar('personas', {
    slug: unico(api.codigo(t), datos.personas()),
    nombre, apellido: apellido || null, es_demo: false,
    /* Acá sí entra aprobada, al revés que en el asistente de memorias. Allá la
       persona se crea de paso, mientras se transcribe un aporte que todavía
       nadie miró, y la compuerta existe para eso. Acá el gesto es deliberado:
       alguien se sentó a registrar un parentesco, y eso ES la revisión. Si
       entrara pendiente no habría forma de aprobarla nunca —sólo se aprueba
       aprobando la memoria que la nombra, y ésta no tiene ninguna—, y quedaría
       invisible para siempre en un árbol que ya la dibuja. */
    estado: 'aprobada',
    creado_por: api.quien(),
    /* vive se deja sin dato: el sitio presume viva a quien no tiene fecha y le
       oculta fechas y notas. */
  });
  /* A la caché en el acto: el chip se pinta con el nombre, no con un hueco. */
  return datos.altaPersona ? datos.altaPersona(fila) : fila;
}

/* ------------------------------------------------------------------ */
/* El formulario                                                       */
/* ------------------------------------------------------------------ */

export function formularioFamilia(li, n, { datos, cerrar, refrescar }) {
  const caja = document.createElement('div');
  caja.className = 'ficha-form';
  li.append(caja);

  const nuevo = !n.id;
  let a = n.persona_a_id || null;
  let b = n.persona_b_id || null;
  let hijos = [...(n.hijos || [])];

  const err = document.createElement('p');
  err.className = 'error'; err.hidden = true;
  const fallar = m => { err.textContent = m; err.hidden = false; };

  /* --- la pareja --- */
  const h1 = document.createElement('p');
  h1.className = 'ficha-titulo';
  h1.textContent = 'La pareja';
  const pareja = document.createElement('div');
  caja.append(h1, pareja);

  /* --- los hijos --- */
  const h2 = document.createElement('p');
  h2.className = 'ficha-titulo';
  h2.textContent = 'Los hijos';
  const listaHijos = document.createElement('div');
  listaHijos.className = 'ficha-alias';
  const cajaHijo = document.createElement('div');

  /* --- la unión --- */
  const par = document.createElement('div');
  par.className = 'par';
  const lTipo = document.createElement('label');
  lTipo.textContent = 'Qué los une';
  const tipo = document.createElement('select');
  for (const [v, t] of UNIONES) {
    const o = document.createElement('option');
    o.value = v; o.textContent = t;
    if ((n.tipo_union || 'matrimonio') === v) o.selected = true;
    tipo.append(o);
  }
  lTipo.append(tipo);
  const lAnio = document.createElement('label');
  lAnio.textContent = 'Año de la unión';
  const anio = Object.assign(document.createElement('input'),
    { type: 'number', min: '1700', max: String(new Date().getFullYear()),
      value: n.anio_union ?? '', placeholder: 'si se sabe' });
  lAnio.append(anio);
  par.append(lTipo, lAnio);

  const elegidos = () => [a, b, ...hijos].filter(Boolean);

  const chip = (id, quitar) => {
    const c = document.createElement('span');
    c.className = 'chip';
    c.append(document.createTextNode(nombreDe(persona(datos, id))));
    const x = Object.assign(document.createElement('button'),
      { type: 'button', textContent: '×', title: 'Sacar' });
    x.addEventListener('click', quitar);
    c.append(x);
    return c;
  };

  function pintarPareja() {
    pareja.innerHTML = '';
    const puestos = document.createElement('div');
    puestos.className = 'ficha-alias';
    if (a) puestos.append(chip(a, () => { a = b; b = null; pintarPareja(); }));
    if (b) puestos.append(chip(b, () => { b = null; pintarPareja(); }));
    pareja.append(puestos);
    if (!a || !b) {
      elegirPersona(pareja, {
        etiqueta: a ? 'La otra persona de la pareja' : 'Una de las dos personas',
        datos, excluir: elegidos,
        alElegir: p => { if (!p) return; if (!a) a = p.id; else b = p.id; pintarPareja(); },
      });
    }
    /* Una sola persona es un núcleo válido —una madre sola con sus hijos— y el
       archivo tiene que poder decirlo sin inventar un cónyuge. */
    const nota = document.createElement('p');
    nota.className = 'ayuda';
    nota.textContent = a && !b
      ? 'Con una sola persona también se puede guardar: queda como madre o padre solo.'
      : 'Se dibujan a la misma altura, una al lado de la otra.';
    pareja.append(nota);
  }

  function pintarHijos() {
    listaHijos.innerHTML = '';
    for (const id of hijos)
      listaHijos.append(chip(id, () => { hijos = hijos.filter(x => x !== id); pintarHijos(); }));
    cajaHijo.innerHTML = '';
    elegirPersona(cajaHijo, {
      etiqueta: hijos.length ? 'Sumar otro hijo o hija' : 'Sumar un hijo o una hija',
      datos, excluir: elegidos,
      alElegir: p => { if (p && !hijos.includes(p.id)) { hijos.push(p.id); pintarHijos(); } },
    });
  }

  pintarPareja();
  caja.append(h2, listaHijos, cajaHijo, par);
  pintarHijos();

  /* --- los mandos --- */
  const mandos = document.createElement('div');
  mandos.className = 'mandos';
  const guardar = Object.assign(document.createElement('button'), { textContent: 'Guardar' });
  const cancelar = Object.assign(document.createElement('button'),
    { className: 'enlace', textContent: 'cancelar' });
  cancelar.addEventListener('click', cerrar);
  mandos.append(guardar, cancelar);

  if (!nuevo) {
    /* Deshacer, no borrar gente. Un parentesco equivocado no se despublica
       —no tiene con qué— y dejarlo puesto afirma algo falso sobre familias que
       existen. Las personas quedan. */
    const deshacer = Object.assign(document.createElement('button'),
      { className: 'enlace peligro', textContent: 'deshacer esta familia' });
    let seguro = false;
    deshacer.addEventListener('click', async () => {
      if (!seguro) {
        seguro = true;
        deshacer.textContent = '¿seguro? las personas quedan, se saca el parentesco';
        setTimeout(() => { seguro = false; deshacer.textContent = 'deshacer esta familia'; }, 6000);
        return;
      }
      deshacer.disabled = true;
      try {
        await api.borrar('nucleo_hijos', `nucleo_id=eq.${encodeURIComponent(n.id)}`);
        await api.borrar('nucleos_familiares', `id=eq.${encodeURIComponent(n.id)}`);
        await refrescar();
        cerrar();
      } catch (x) { deshacer.disabled = false; fallar(x.message); }
    });
    mandos.append(deshacer);
  }

  guardar.addEventListener('click', async () => {
    if (!a) return fallar('Falta al menos una persona de la pareja.');
    guardar.disabled = true; guardar.textContent = 'Guardando…';
    err.hidden = true;
    try {
      const campos = {
        persona_a_id: a,
        persona_b_id: b,
        tipo_union: tipo.value,
        anio_union: anio.value ? Number(anio.value) : null,
      };
      let id = n.id;
      if (nuevo) id = (await api.insertar('nucleos_familiares', { ...campos, es_demo: false })).id;
      else await api.actualizar('nucleos_familiares', id, campos);

      /* Se suma el que entró y se saca el que salió, igual que con los alias.
         Reemplazar la lista entera dejaría un hueco: entre el borrado y la
         escritura, una familia sin hijos. */
      const antes = n.hijos || [];
      const sumar = hijos.filter(x => !antes.includes(x));
      const sacar = antes.filter(x => !hijos.includes(x));
      if (sumar.length)
        await api.insertar('nucleo_hijos',
          sumar.map(x => ({ nucleo_id: id, persona_id: x, tipo: 'biologico' })));
      for (const x of sacar)
        await api.borrar('nucleo_hijos',
          `nucleo_id=eq.${encodeURIComponent(id)}&persona_id=eq.${encodeURIComponent(x)}`);

      await refrescar();
      cerrar();
    } catch (x) {
      guardar.disabled = false; guardar.textContent = 'Guardar';
      fallar(x.message);
    }
  });

  caja.append(err, mandos);
}
