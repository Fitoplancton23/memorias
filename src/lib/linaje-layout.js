/* Layout de linaje centrado en una persona foco.
   Determinístico, no force-directed: un árbol genealógico dibujado con fuerzas
   queda orgánico y es ilegible. Dos árboles que se encuentran en el foco —
   ascendientes hacia arriba, descendientes hacia abajo — con las parejas juntas
   y los hijos centrados bajo sus padres (Reingold-Tilford sobre uniones).

   Pensado para un BOSQUE, no para un árbol: los datos del pueblo van a ser
   muchos grupos familiares anchos, poco profundos y desconectados entre sí.  */

export const MEDIDAS = { W: 158, H: 54, GX: 22, GY: 96 };

export function construirLinaje(foco, porSlug, opciones = {}) {
  const { arriba = 3, abajo = 3 } = opciones;
  const { W, H, GX, GY } = MEDIDAS;
  const P = porSlug;
  if (!P[foco]) return null;

  const anchoUnidad = n => n * W + Math.max(0, n - 1) * GX;
  const nodos = new Map();          // slug -> { slug, gen, x }
  const enlaces = [];
  const usados = new Set([foco]);   // en un pueblo chico hay primos casados: nadie se dibuja dos veces

  const poner = (slug, gen, cx) => { if (!nodos.has(slug)) nodos.set(slug, { slug, gen, x: cx }); };

  /* ---------- descendientes ---------- */
  const medirAbajo = (slug, gen) => {
    const p = P[slug];
    const pareja = [slug, ...p.conyuges.filter(c => P[c] && !usados.has(c))];
    pareja.slice(1).forEach(c => usados.add(c));
    const propio = anchoUnidad(pareja.length);
    if (gen >= abajo) return { slug, gen, pareja, propio, total: propio, hijos: [] };

    const hijos = [...new Set(pareja.flatMap(s => P[s].hijos))]
      .filter(h => P[h] && !usados.has(h));
    hijos.forEach(h => usados.add(h));
    const sub = hijos.map(h => medirAbajo(h, gen + 1));
    const anchoHijos = sub.reduce((a, s) => a + s.total, 0) + Math.max(0, sub.length - 1) * GX;
    return { slug, gen, pareja, propio, total: Math.max(propio, anchoHijos), hijos: sub, anchoHijos };
  };

  const ubicarAbajo = (n, izq) => {
    const centro = izq + n.total / 2;
    n.pareja.forEach((s, i) => poner(s, n.gen, centro - n.propio / 2 + i * (W + GX) + W / 2));
    if (n.pareja.length === 2) enlaces.push({ tipo: 'union', a: n.pareja[0], b: n.pareja[1] });
    if (!n.hijos.length) return;
    let x = centro - n.anchoHijos / 2;
    for (const h of n.hijos) {
      ubicarAbajo(h, x);
      enlaces.push({ tipo: 'filiacion', padres: n.pareja, hijo: h.slug });
      x += h.total + GX;
    }
  };

  /* ---------- ascendientes ---------- */
  const medirArriba = (slug, gen) => {
    const p = P[slug];
    const propio = W;
    if (-gen >= arriba) return { slug, gen, propio, total: propio, padres: [] };
    const padres = p.padres.filter(x => P[x] && !usados.has(x));
    padres.forEach(x => usados.add(x));
    const sub = padres.map(x => medirArriba(x, gen - 1));
    const anchoPadres = sub.reduce((a, s) => a + s.total, 0) + Math.max(0, sub.length - 1) * GX;
    return { slug, gen, propio, total: Math.max(propio, anchoPadres), padres: sub, anchoPadres };
  };

  const ubicarArriba = (n, izq, cxFijo = null) => {
    const centro = cxFijo ?? (izq + n.total / 2);
    poner(n.slug, n.gen, centro);
    if (!n.padres?.length) return;
    let x = centro - n.anchoPadres / 2;
    for (const p of n.padres) {
      ubicarArriba(p, x);
      enlaces.push({ tipo: 'filiacion', padres: n.padres.map(q => q.slug), hijo: n.slug });
      x += p.total + GX;
    }
    if (n.padres.length === 2) enlaces.push({ tipo: 'union', a: n.padres[0].slug, b: n.padres[1].slug });
  };

  /* El orden importa: primero se MIDEN las dos ramas de ascendientes, y recién
     entonces se separa la pareja foco lo necesario para que no se pisen. Si se
     ubica la pareja primero, la rama de la esposa queda descentrada respecto de
     ella y su apellido parece colgar de otro lado. */
  const abajoRaiz = medirAbajo(foco, 0);
  const pareja = abajoRaiz.pareja;
  const arribas = pareja.map(s => medirArriba(s, 0));

  /* La pareja SIEMPRE queda contigua: son una unidad y separarlos para acomodar
     a los abuelos rompe la lectura. Los ascendientes se acomodan en fila y los
     conectores bajan en diagonal, que es como se ve un pedigrí de verdad. */
  const sep = W + GX;

  const cx = [];
  pareja.forEach((s, i) => { cx.push(i === 0 ? 0 : cx[i - 1] + sep); poner(s, 0, cx[i]); });
  if (pareja.length === 2) enlaces.push({ tipo: 'union', a: pareja[0], b: pareja[1] });

  arribas.forEach((raiz, i) => {
    nodos.delete(pareja[i]);
    ubicarArriba(raiz, 0, cx[i]);
    poner(pareja[i], 0, cx[i]);
  });

  const centroPareja = (cx[0] + cx[cx.length - 1]) / 2;
  if (abajoRaiz.hijos?.length) {
    let x = centroPareja - abajoRaiz.anchoHijos / 2;
    for (const h of abajoRaiz.hijos) {
      ubicarAbajo(h, x);
      enlaces.push({ tipo: 'filiacion', padres: pareja, hijo: h.slug });
      x += h.total + GX;
    }
  }

  /* red de seguridad: si dos ramas igual se rozan, se corren a la derecha lo mínimo */
  const filas = {};
  for (const n of nodos.values()) (filas[n.gen] ||= []).push(n);
  for (const fila of Object.values(filas)) {
    fila.sort((a, b) => a.x - b.x);
    for (let i = 1; i < fila.length; i++) {
      const minimo = fila[i - 1].x + W + GX;
      if (fila[i].x < minimo) fila[i].x = minimo;
    }
  }

  /* ---------- normalizar a coordenadas de dibujo ---------- */
  const lista = [...nodos.values()];
  const minX = Math.min(...lista.map(n => n.x)) - W / 2;
  const minG = Math.min(...lista.map(n => n.gen));
  const maxG = Math.max(...lista.map(n => n.gen));
  for (const n of lista) { n.x -= minX; n.y = (n.gen - minG) * GY; }

  const unicos = new Set();
  const enlacesLimpios = enlaces.filter(e => {
    const k = e.tipo === 'union' ? `u:${[e.a, e.b].sort().join('|')}`
                                 : `f:${e.hijo}|${[...e.padres].sort().join('|')}`;
    if (unicos.has(k)) return false;
    unicos.add(k);
    return e.tipo === 'union' ? nodos.has(e.a) && nodos.has(e.b)
                              : nodos.has(e.hijo) && e.padres.some(p => nodos.has(p));
  });

  return {
    foco,
    nodos: lista,
    enlaces: enlacesLimpios,
    ancho: Math.max(...lista.map(n => n.x)) + W / 2,
    alto: (maxG - minG) * GY + H,
    generaciones: maxG - minG + 1
  };
}

/* Componentes conexas: cada una es un grupo familiar del bosque. */
export function componentes(personas) {
  const P = Object.fromEntries(personas.map(p => [p.slug, p]));
  const visto = new Set();
  const grupos = [];
  for (const p of personas) {
    if (visto.has(p.slug)) continue;
    const cola = [p.slug], grupo = [];
    visto.add(p.slug);
    while (cola.length) {
      const s = cola.pop();
      grupo.push(s);
      for (const v of [...P[s].padres, ...P[s].hijos, ...P[s].conyuges])
        if (P[v] && !visto.has(v)) { visto.add(v); cola.push(v); }
    }
    grupos.push(grupo);
  }
  return grupos.sort((a, b) => b.length - a.length);
}

/* Puentes: fotos donde aparecen juntas personas de dos grupos que todavía no
   están emparentados. Es donde la herramienta produce conocimiento nuevo. */
export function puentes(personas, documentos) {
  const grupoDe = {};
  componentes(personas).forEach((g, i) => g.forEach(s => { grupoDe[s] = i; }));
  const pares = new Map();
  for (const d of documentos) {
    const gs = [...new Set(d.personas.map(s => grupoDe[s]).filter(g => g !== undefined))];
    if (gs.length < 2) continue;
    for (let i = 0; i < gs.length; i++)
      for (let j = i + 1; j < gs.length; j++) {
        const k = [gs[i], gs[j]].sort((a, b) => a - b).join('-');
        if (!pares.has(k)) pares.set(k, { grupos: [gs[i], gs[j]], documentos: [] });
        pares.get(k).documentos.push(d.slug);
      }
  }
  return [...pares.values()];
}
