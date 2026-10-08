/* Piezas sueltas del panel que usan más de una pantalla.
   -------------------------------------------------------------------------
   Vivían adentro de panel.js, privadas. Cuando apareció la pantalla de armar
   una familia hizo falta el mismo buscador de personas, y copiarlo habría
   dejado dos buscadores que se separan con el tiempo: uno plegaría tildes y el
   otro no, y nadie se daría cuenta hasta que alguien no encuentre a su abuela.  */

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
  ? ([p.nombre, p.apellido].filter(Boolean).join(' ') || '(sin nombre)')
  : '(sin nombre)';
