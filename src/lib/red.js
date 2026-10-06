/* Arma el grafo de la red.

   NO es un grafo plano de personas: es BIPARTITO. La unión conyugal es un nodo
   propio —como el registro FAM de GEDCOM— y no una arista entre dos personas.
   Esa es la diferencia entre "un grafo con gente" y "una genealogía": permite
   que un hijo pertenezca a UNA unión concreta, y que alguien que enviudó y se
   volvió a casar tenga dos uniones distintas con sus hijos bien separados.

   Tres tipos de arista:
     conyuge      persona → familia
     hijo         familia → persona
     coaparicion  persona ↔ persona, aparecen juntos en una foto sin parentesco
                  conocido. Es el puente: lo único que cruza la estructura.   */

export function armarRed(personas, documentos, familias = [], lugares = [], acontecimientos = []) {
  const P = Object.fromEntries(personas.map(p => [p.slug, p]));
  const fams = familias.filter(f => f.conyuges.some(c => P[c]) || f.hijos.some(h => P[h]));

  /* componentes conexas por parentesco: cada una es un grupo familiar */
  const grupo = {};
  let g = 0;
  for (const p of personas) {
    if (grupo[p.slug] !== undefined) continue;
    const cola = [p.slug];
    grupo[p.slug] = g;
    while (cola.length) {
      const s = cola.pop();
      for (const v of [...P[s].padres, ...P[s].hijos, ...P[s].conyuges])
        if (P[v] && grupo[v] === undefined) { grupo[v] = g; cola.push(v); }
    }
    g++;
  }

  /* Co-aparición: dos personas de LINAJES distintos en la misma memoria.
     Antes el filtro era "componentes de parentesco distintas", y estaba mal:
     en un pueblo chico, a la segunda o tercera generación todo el mundo cae en
     la misma componente, así que ese filtro borraba casi todas las conexiones
     históricas — justo lo que el proyecto existe para mostrar.

     El parentesco y la historia son dos tipos de relación distintos y no se
     mezclan: se excluyen los parientes directos (misma unión conyugal, padres
     e hijos) porque ese vínculo ya lo dibuja la genealogía, y contarlo otra vez
     acá inflaría el grosor de las curvas con algo que no es una memoria
     compartida sino un casamiento. */
  const clave = (a, b) => [a, b].sort().join('\u0000');
  const directo = new Set();
  for (const s of Object.keys(P))
    for (const v of [...P[s].padres, ...P[s].hijos, ...P[s].conyuges])
      if (P[v]) directo.add(clave(s, v));

  const coap = new Map();
  for (const d of documentos) {
    const gente = d.personas.filter(s => P[s]);
    for (let i = 0; i < gente.length; i++)
      for (let j = i + 1; j < gente.length; j++) {
        const [a, b] = [gente[i], gente[j]];
        const apA = P[a].apellido || '', apB = P[b].apellido || '';
        if (apA && apB && apA === apB) continue;   /* mismo linaje: no es un cruce */
        if (directo.has(clave(a, b))) continue;    /* ya lo cuenta la genealogía */
        const k = clave(a, b);
        if (!coap.has(k)) coap.set(k, { source: a, target: b, tipo: 'coaparicion', docs: [] });
        coap.get(k).docs.push(d.slug);
      }
  }

  const nodos = personas.map(p => ({
    id: p.slug, tipo: 'persona',
    nombre: [p.nombre, p.apellido].filter(Boolean).join(' ') || p.slug,
    apellido: p.apellido || '',
    /* El apodo y los alias viajan al buscador. Sin esto, alguien que escribe
       "el Negro" —que es como lo nombra el pueblo— no encuentra a nadie. */
    otros: (p.apodo || '').split(';').map(x => x.trim()).filter(Boolean),
    nac: p.nacimiento?.texto || '', def: p.defuncion?.texto || '',
    docs: p.documentos.length, grupo: grupo[p.slug],
    r: 7 + Math.sqrt(p.documentos.length) * 3.4,
    suelto: !p.padres.length && !p.hijos.length && !p.conyuges.length
  }));

  const enlaces = [];
  for (const f of fams) {
    const conyuges = f.conyuges.filter(c => P[c]);
    const hijos = f.hijos.filter(h => P[h]);
    nodos.push({ id: f.id, tipo: 'familia', conyuges, hijos, r: 3 });
    for (const c of conyuges) enlaces.push({ source: c, target: f.id, tipo: 'conyuge' });
    for (const h of hijos) enlaces.push({ source: f.id, target: h, tipo: 'hijo' });
  }
  enlaces.push(...coap.values());

  /* --- lugares y acontecimientos como nodos de contexto ---------------------
     Una persona se vincula a un lugar o a un hecho cuando comparten al menos un
     documento. Nunca entran a la grilla genealógica: son el entorno, no la
     familia. Es lo que convierte esto en una red de información y no sólo en
     una genealogía. */
  const tocados = { lugar: {}, evento: {} };
  for (const d of documentos) {
    const gente = d.personas.filter(s => P[s]);
    if (!gente.length) continue;
    for (const l of d.lugares || []) {
      tocados.lugar[l] ||= new Set();
      for (const s of gente) tocados.lugar[l].add(s);
    }
    for (const a of d.acontecimientos || []) {
      tocados.evento[a] ||= new Set();
      for (const s of gente) tocados.evento[a].add(s);
    }
  }
  for (const l of lugares) {
    const gente = tocados.lugar[l.slug];
    if (!gente || !gente.size) continue;
    nodos.push({ id: 'lugar:' + l.slug, tipo: 'lugar', nombre: l.nombre, ref: l.slug, r: 9 });
    for (const s of gente) enlaces.push({ source: s, target: 'lugar:' + l.slug, tipo: 'entorno' });
  }
  for (const a of acontecimientos) {
    const gente = tocados.evento[a.slug];
    if (!gente || !gente.size) continue;
    nodos.push({ id: 'evento:' + a.slug, tipo: 'evento', nombre: a.titulo, ref: a.slug, r: 9 });
    for (const s of gente) enlaces.push({ source: s, target: 'evento:' + a.slug, tipo: 'entorno' });
  }

  return { nodos, enlaces, grupos: g, familias: fams };
}
