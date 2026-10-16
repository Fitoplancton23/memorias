/* Piezas sueltas del panel que usan más de una pantalla.
   -------------------------------------------------------------------------
   Vivían adentro de panel.js, privadas. Cuando apareció la pantalla de armar
   una familia hizo falta el mismo buscador de personas, y copiarlo habría
   dejado dos buscadores que se separan con el tiempo: uno plegaría tildes y el
   otro no, y nadie se daría cuenta hasta que alguien no encuentre a su abuela.  */

import { partir, sirve, comoSeLlama } from '../persona-nueva.js';

/* El pueblo escribe sin acentos y de apuro. Se pliegan las tildes para buscar,
   igual que en el buscador del sitio. */
export const sinTildes = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrar(filas, texto, campos) {
  const t = sinTildes(texto);
  if (!t) return [];
  return filas.filter(f => campos(f).filter(Boolean).some(v => sinTildes(v).includes(t)));
}

/* Un buscador con navegación por teclado. Quien carga cien memorias trabaja
   con las manos en el teclado; obligarlo al mouse en cada nombre es lo que
   convierte la carga en una tarea insoportable. */
export function buscador(campo, lista, buscar, mostrar, elegir) {
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
      opciones = []; cursor = -1; pintar();
    }
    if (e.key === 'Escape') { opciones = []; cursor = -1; pintar(); }
  });

  campo.addEventListener('blur', () => setTimeout(() => { opciones = []; cursor = -1; pintar(); }, 150));

  /* Para poder vaciar la lista desde afuera: cuando elegir() cambia la
     pantalla entera, las sugerencias viejas no pueden quedar colgadas. */
  return { limpiar: () => { opciones = []; cursor = -1; pintar(); } };
}

/* El slug es la dirección pública: hay un índice único encima, así que el
   segundo "Juan Silveira" tiene que salir juan-silveira-2. */
export function unico(base, existentes) {
  const usados = new Set(existentes.map(x => x.slug));
  if (!base) base = 'sin-nombre';
  if (!usados.has(base)) return base;
  for (let i = 2; ; i++) if (!usados.has(`${base}-${i}`)) return `${base}-${i}`;
}

export const nombreDe = p => p
  ? (comoSeLlama(p) || '(sin nombre)')
  : '(sin nombre)';

/* ------------------------------------------------------------------ */
/* El alta de una persona, preguntando en vez de adivinando            */
/* ------------------------------------------------------------------ */
/* Antes el panel partía el texto escrito por la última palabra y guardaba sin
   mostrar nada: "Juan Potkova" salía bien y "Ana María De Souza" salía con
   apellido "Souza" y nombre "Ana María De", y el error se descubría después,
   en la ficha, si alguien lo miraba.

   Y sobre todo: no había dónde poner un apodo. A alguien que en el pueblo es
   "el Negro" y nada más, el panel le inventaba el nombre "el" y el apellido
   "Negro" para que la base lo aceptara. Inventar un dato que no tenemos es
   justamente lo que este archivo no hace.

   Ahora los tres campos se muestran, con la partición como propuesta y no
   como decisión, y alcanza con llenar uno. */
export function altaPersona(texto, alGuardar, alCancelar) {
  const caja = document.createElement('div');
  caja.className = 'alta-persona';

  const prop = partir(texto);
  const campos = {};
  const fila = document.createElement('div');
  fila.className = 'alta-campos';
  for (const [clave, rotulo, pista] of [
    ['nombre',   'Nombre',   'Juan'],
    ['apellido', 'Apellido', 'Potkova'],
    ['apodo',    'Apodo',    'el Negro'],
  ]) {
    const l = document.createElement('label');
    l.textContent = rotulo;
    const i = document.createElement('input');
    i.type = 'text'; i.value = prop[clave] || ''; i.placeholder = pista;
    i.autocomplete = 'off'; i.spellcheck = false;
    campos[clave] = i;
    l.append(i);
    fila.append(l);
  }

  /* Qué falta, dicho como lo diría una persona. Un botón apagado sin razón
     escrita al lado se lee como que el panel se rompió. */
  const aviso = document.createElement('p');
  aviso.className = 'alta-aviso';
  aviso.textContent = 'Con uno solo alcanza: puede ser nada más que el apodo.';

  const botones = document.createElement('div');
  botones.className = 'alta-botones';
  const ok = document.createElement('button');
  ok.type = 'button'; ok.className = 'primario'; ok.textContent = 'Agregar';
  const no = document.createElement('button');
  no.type = 'button'; no.className = 'enlace'; no.textContent = 'Cancelar';
  botones.append(ok, no);

  const leer = () => ({
    nombre: campos.nombre.value, apellido: campos.apellido.value, apodo: campos.apodo.value,
  });
  const revisar = () => {
    const vale = sirve(leer());
    ok.disabled = !vale;
    aviso.textContent = vale
      ? `Se va a cargar como «${comoSeLlama(leer())}».`
      : 'Falta el nombre, el apellido o el apodo. Con uno solo alcanza.';
    aviso.classList.toggle('alta-falta', !vale);
  };
  for (const i of Object.values(campos)) {
    i.addEventListener('input', revisar);
    i.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && !ok.disabled) { ev.preventDefault(); ok.click(); }
      if (ev.key === 'Escape') { ev.preventDefault(); no.click(); }
    });
  }
  ok.addEventListener('click', () => { if (!ok.disabled) alGuardar(leer()); });
  no.addEventListener('click', () => alCancelar && alCancelar());

  caja.append(fila, aviso, botones);
  revisar();
  /* Al primero que esté vacío, que es donde la persona va a querer escribir:
     si vino "Potkova" solo, el foco va al apellido y no al nombre lleno. */
  setTimeout(() => (Object.values(campos).find(i => !i.value) || campos.nombre).focus(), 0);
  return caja;
}

/* ------------------------------------------------------------------ */
/* Ver una foto en grande                                              */
/* ------------------------------------------------------------------ */
/* El panel mostraba las fotos en miniaturas de tres centímetros, y con eso
   hay que decidir si una foto entra al archivo: si está derecha, si se lee,
   si el escaneo salió movido, si es la misma que ya está cargada. Eso no se
   puede ver en una miniatura, y la única salida era publicar y mirar el
   sitio — o sea, revisar después de haber publicado.

   Se abre sobre el panel y no en otra pestaña: revisar una memoria es mirar
   sus cuatro fotos una tras otra, y cuatro pestañas para eso es perder el
   hilo de lo que se estaba revisando.

   `fotos` son URLs. Devuelve una función que cierra. */
export function visorFotos(fotos, desde = 0) {
  const urls = (fotos || []).filter(Boolean);
  if (!urls.length) return () => {};
  let i = Math.min(Math.max(0, desde), urls.length - 1);
  const antes = document.activeElement;

  const capa = document.createElement('div');
  capa.className = 'visor';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', 'Fotografía en grande');

  const img = document.createElement('img');
  img.alt = '';
  const cuenta = document.createElement('p');
  cuenta.className = 'visor-cuenta';

  const cerrar = document.createElement('button');
  cerrar.type = 'button'; cerrar.className = 'visor-cerrar';
  cerrar.setAttribute('aria-label', 'Cerrar'); cerrar.textContent = '×';

  const ant = document.createElement('button');
  ant.type = 'button'; ant.className = 'visor-flecha visor-ant';
  ant.setAttribute('aria-label', 'Foto anterior'); ant.textContent = '‹';
  const sig = document.createElement('button');
  sig.type = 'button'; sig.className = 'visor-flecha visor-sig';
  sig.setAttribute('aria-label', 'Foto siguiente'); sig.textContent = '›';

  const pintar = () => {
    img.src = urls[i];
    cuenta.textContent = urls.length > 1 ? `${i + 1} de ${urls.length}` : '';
    cuenta.hidden = urls.length < 2;
    ant.hidden = urls.length < 2;
    sig.hidden = urls.length < 2;
    ant.disabled = i === 0;
    sig.disabled = i === urls.length - 1;
  };
  const irA = n => { i = Math.min(Math.max(0, n), urls.length - 1); pintar(); };

  let ido = false;
  const salir = () => {
    if (ido) return;
    ido = true;
    removeEventListener('keydown', alTeclado, true);
    capa.remove();
    document.body.classList.remove('con-visor');
    /* El foco vuelve de donde vino: si no, cerrar deja el teclado al principio
       de la página y hay que volver a bajar hasta donde se estaba. */
    if (antes && antes.focus) antes.focus();
  };
  const alTeclado = ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); salir(); }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); irA(i - 1); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); irA(i + 1); }
  };

  cerrar.addEventListener('click', salir);
  ant.addEventListener('click', () => irA(i - 1));
  sig.addEventListener('click', () => irA(i + 1));
  /* Tocar afuera cierra; tocar la foto, no. Con una foto a pantalla casi
     completa, exigir apuntarle a la cruz es exigir puntería. */
  capa.addEventListener('click', ev => { if (ev.target === capa) salir(); });
  addEventListener('keydown', alTeclado, true);

  capa.append(ant, img, sig, cuenta, cerrar);
  document.body.append(capa);
  document.body.classList.add('con-visor');
  pintar();
  cerrar.focus();
  return salir;
}
