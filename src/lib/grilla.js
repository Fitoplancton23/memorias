/* Grilla genealógica determinística para la familia del foco.

   Una simulación de fuerzas nunca va a producir una grilla: negocia posiciones,
   no las calcula. Acá las posiciones se computan — filas por generación, columnas
   uniformes, parejas contiguas — y el resto de la red queda para las fuerzas.
   Eso es lo que hace que una familia se lea al instante sin que el conjunto
   parezca un organigrama: la estructura sólo aparece donde estás mirando.      */

export const GRILLA = { COL: 152, FILA: 156, HUECO: 34 };

export function construirGrilla(foco, personas, familias, opciones = {}) {
  const { arriba = 2, abajo = 2 } = opciones;
  const { COL, FILA, HUECO } = GRILLA;

  const P = Object.fromEntries(personas.map(p => [p.id ?? p.slug, p]));
  const F = Object.fromEntries(familias.map(f => [f.id, f]));
  if (!P[foco]) return null;

  const unionesDe = {}, origenDe = {};
  for (const f of familias) {
    for (const c of f.conyuges) if (P[c]) (unionesDe[c] ||= []).push(f.id);
    for (const h of f.hijos) if (P[h]) origenDe[h] = f.id;
  }

  const usados = new Set();
  const nodos = [];     // { id, x, y, gen }
  const uniones = [];   // { id, x, y, a, b, hijos }
  const poner = (id, x, gen) => { nodos.push({ id, x, y: gen * FILA, gen }); };

  /* ---------- descendencia ---------- */
  const anchoFila = n => n * COL + Math.max(0, n - 1) * HUECO;

  function medir(pid, gen) {
    usados.add(pid);
    const fams = gen >= abajo ? [] : (unionesDe[pid] || []).map(i => F[i]).filter(Boolean).slice(0, 2);
    const bloques = fams.map(f => {
      const otro = f.conyuges.find(c => c !== pid && P[c] && !usados.has(c)) || null;
      if (otro) usados.add(otro);
      const hijos = f.hijos.filter(h => P[h] && !usados.has(h)).map(h => medir(h, gen + 1));
      const anchoHijos = hijos.reduce((a, h) => a + h.ancho, 0) + Math.max(0, hijos.length - 1) * HUECO;
      return { fam: f, otro, hijos, anchoHijos };
    });
    const nP = 1 + bloques.filter(b => b.otro).length;
    const anchoPersonas = anchoFila(nP);
    const anchoHijos = bloques.reduce((a, b) => a + Math.max(b.anchoHijos, 0), 0)
                     + Math.max(0, bloques.length - 1) * HUECO;
    return { pid, gen, bloques, anchoPersonas, anchoHijos, ancho: Math.max(anchoPersonas, anchoHijos) };
  }

  function ubicar(n, x0) {
    const centro = x0 + n.ancho / 2;
    /* cónyuge de la primera unión a la izquierda, de la segunda a la derecha:
       es la convención de los pedigríes para las segundas nupcias */
    const orden = [];
    if (n.bloques[0]?.otro) orden.push(n.bloques[0].otro);
    orden.push(n.pid);
    if (n.bloques[1]?.otro) orden.push(n.bloques[1].otro);
    const px = {};
    let x = centro - anchoFila(orden.length) / 2;
    for (const id of orden) { px[id] = x + COL / 2; poner(id, px[id], n.gen); x += COL + HUECO; }

    for (const b of n.bloques) {
      const ax = px[n.pid], bx = b.otro != null ? px[b.otro] : null;
      const ux = bx != null ? (ax + bx) / 2 : ax;
      uniones.push({ id: b.fam.id, x: ux, y: n.gen * FILA, a: n.pid, b: b.otro, hijos: b.hijos.map(h => h.pid) });
      let hx = ux - b.anchoHijos / 2;
      for (const h of b.hijos) { ubicar(h, hx); hx += h.ancho + HUECO; }
    }
  }

  /* ---------- ascendencia ---------- */
  function medirArriba(pid, gen) {
    const fo = origenDe[pid] ? F[origenDe[pid]] : null;
    if (!fo || -gen >= arriba) return { pid, gen, padres: [], ancho: COL };
    const padres = fo.conyuges.filter(c => P[c] && !usados.has(c));
    padres.forEach(c => usados.add(c));
    const sub = padres.map(c => medirArriba(c, gen - 1));
    const anchoPadres = sub.reduce((a, s) => a + s.ancho, 0) + Math.max(0, sub.length - 1) * HUECO;
    return { pid, gen, fam: fo, padres: sub, anchoPadres, ancho: Math.max(COL, anchoPadres) };
  }

  function ubicarArriba(n, cx) {
    if (!n.padres?.length) return;
    /* La pareja SIEMPRE contigua: separarla para acomodar a los abuelos rompe la
       lectura. Los abuelos se acomodan arriba y, si chocan, los separa el pase
       final por filas — que corre las parejas enteras, nunca a un cónyuge solo. */
    let x = cx - anchoFila(n.padres.length) / 2;
    const xs = [];
    for (const p of n.padres) {
      const pxx = x + COL / 2;
      xs.push(pxx);
      poner(p.pid, pxx, p.gen);
      x += COL + HUECO;
      ubicarArriba(p, pxx);
    }
    uniones.push({
      id: n.fam.id, x: (xs[0] + xs[xs.length - 1]) / 2, y: (n.gen - 1) * FILA,
      a: n.padres[0].pid, b: n.padres[1]?.pid ?? null, hijos: [n.pid]
    });
  }

  /* ---------- armado ---------- */
  const origen = origenDe[foco] ? F[origenDe[foco]] : null;
  if (origen) {
    const hermanos = origen.hijos.filter(h => P[h]);
    hermanos.forEach(h => usados.add(h));
    const subs = hermanos.map(h => medir(h, 0));
    const total = subs.reduce((a, s) => a + s.ancho, 0) + Math.max(0, subs.length - 1) * HUECO;
    let x = -total / 2;
    for (const s of subs) { ubicar(s, x); x += s.ancho + HUECO; }
    const nf = { pid: foco, gen: 0, fam: origen, padres: [], anchoPadres: 0 };
    const padres = origen.conyuges.filter(c => P[c] && !usados.has(c));
    padres.forEach(c => usados.add(c));
    nf.padres = padres.map(c => medirArriba(c, -1));
    nf.anchoPadres = nf.padres.reduce((a, s) => a + s.ancho, 0) + Math.max(0, nf.padres.length - 1) * HUECO;
    const cxHermanos = (Math.min(...subs.map((s, i) => 0)) , 0);
    const xsHer = nodos.filter(n => hermanos.includes(n.id)).map(n => n.x);
    ubicarArriba(nf, xsHer.length ? (Math.min(...xsHer) + Math.max(...xsHer)) / 2 : 0);
    /* El peine de los padres tiene que bajar a TODOS los hermanos, no sólo al
       foco: si no, los hermanos quedan flotando sin conexión visible. */
    const uOrigen = uniones.find(u => u.id === origen.id);
    if (uOrigen) uOrigen.hijos = hermanos.slice();
  } else {
    ubicar(medir(foco, 0), 0);
  }

  /* ---------- separar filas sin romper parejas ---------- */
  function separarFilas() {
    const y = {}; for (const n of nodos) y[n.id] = n.y;
    const filas = {};
    for (const n of nodos) (filas[n.y] ||= []).push(n);
    for (const fila of Object.values(filas)) {
      const idx = Object.fromEntries(fila.map((n, i) => [n.id, i]));
      const raiz = fila.map((_, i) => i);
      const buscar = i => raiz[i] === i ? i : (raiz[i] = buscar(raiz[i]));
      for (const u of uniones)
        if (u.b && idx[u.a] !== undefined && idx[u.b] !== undefined && y[u.a] === y[u.b])
          { const a = buscar(idx[u.a]), b = buscar(idx[u.b]); if (a !== b) raiz[a] = b; }
      const grupos = {};
      fila.forEach((n, i) => { (grupos[buscar(i)] ||= []).push(n); });
      const gs = Object.values(grupos)
        .map(g => ({ g, min: Math.min(...g.map(n => n.x)), max: Math.max(...g.map(n => n.x)) }))
        .sort((a, b) => a.min - b.min);
      for (let i = 1; i < gs.length; i++) {
        const minimo = gs[i - 1].max + COL + HUECO;
        if (gs[i].min < minimo - .01) {
          const d = minimo - gs[i].min;
          gs[i].g.forEach(n => { n.x += d; });
          gs[i].min += d; gs[i].max += d;
        }
      }
    }
    /* las uniones se recolocan sobre sus cónyuges ya corridos */
    const pos = Object.fromEntries(nodos.map(n => [n.id, n]));
    for (const u of uniones) {
      const a = pos[u.a], b = u.b ? pos[u.b] : null;
      if (a) { u.x = b ? (a.x + b.x) / 2 : a.x; u.y = a.y; }
    }
  }
  separarFilas();

  /* centrar en el foco */
  const nf = nodos.find(n => n.id === foco);
  const dx = nf ? nf.x : 0, dy = nf ? nf.y : 0;
  for (const n of nodos) { n.x -= dx; n.y -= dy; }
  for (const u of uniones) { u.x -= dx; u.y -= dy; }

  const xs = nodos.map(n => n.x), ys = nodos.map(n => n.y);
  return {
    foco, nodos, uniones,
    caja: { x0: Math.min(...xs) - COL / 2, x1: Math.max(...xs) + COL / 2,
            y0: Math.min(...ys) - FILA / 2, y1: Math.max(...ys) + FILA / 2 }
  };
}

/* La grilla se construye alrededor del foco y después se centra en él, así que
   entre dos hermanos da el mismo dibujo corrido unos píxeles. Mover a toda la
   familia de costado para recentrar no dice nada, y tapa el movimiento que sí
   dice algo: el de cuando al elegir a otra persona se abre una generación.

   Acá se detecta ese caso —misma gente y todos corridos lo mismo— y se deshace
   la traslación, dejando la grilla pegada donde ya estaba. Devuelve true si la
   fijó. Si alguien se movió distinto, el dibujo cambió de verdad y no se toca. */
export function fijarGrilla(g, previas) {
  if (!g || !previas || !previas.size) return false;
  if (g.nodos.length !== previas.size) return false;
  if (!g.nodos.every(n => previas.has(n.id))) return false;
  const p0 = previas.get(g.nodos[0].id);
  const ox = g.nodos[0].x - p0.x, oy = g.nodos[0].y - p0.y;
  for (const n of g.nodos) {
    const a = previas.get(n.id);
    if (Math.abs(n.x - a.x - ox) > 0.5 || Math.abs(n.y - a.y - oy) > 0.5) return false;
  }
  if (!ox && !oy) return true;
  for (const n of g.nodos) { n.x -= ox; n.y -= oy; }
  for (const u of g.uniones) { u.x -= ox; u.y -= oy; }
  g.caja.x0 -= ox; g.caja.x1 -= ox; g.caja.y0 -= oy; g.caja.y1 -= oy;
  return true;
}
