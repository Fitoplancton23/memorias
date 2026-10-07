/* Arma el grafo de la red.

   NO es un grafo plano de personas: es BIPARTITO. La unión conyugal es un nodo
   propio —como el registro FAM de GEDCOM— y no una arista entre dos personas.
   Esa es la diferencia entre "un grafo con gente" y "una genealogía": permite
   que un hijo pertenezca a UNA unión concreta, y que alguien que enviudó y se
   volvió a casar tenga dos uniones distintas con sus hijos bien separados.

   La memoria también es un nodo, y eso no es un detalle de dibujo.

   La regla maestra del proyecto dice que la memoria es la entidad central, y
   hasta acá era la única entidad central SIN nodo: personas, familias, lugares
   y acontecimientos tenían el suyo; la memoria estaba implícita, escondida
   adentro de una curva entre dos personas. La red dibujaba todo menos aquello
   de lo que todo se desprende.

   Con la memoria como nodo, el recorrido del archivo es el que tiene que ser:
   una persona, las memorias donde aparece, la gente que aparece en ellas, sus
   memorias. Cada salto tiene nombre y cara. Nadie necesita entender un grafo:
   va saltando de gente a momentos.

   Y la Regla 2 deja de ser una promesa que hay que verificar: pasa a ser la
   forma del grafo. Si se borra la memoria desaparece el nodo y con él todas sus
   líneas, y no existe manera de dibujar una conexión inexplicable, porque la
   explicación ES el nodo del medio.

   Los tipos de arista:
     conyuge      persona → familia
     hijo         familia → persona
     aparece      persona → memoria        «fulano aparece en esta memoria»
     ocurre       memoria → lugar · acontecimiento
     coaparicion  persona ↔ persona — NO se dibuja. Es una proyección de
                  `aparece` sobre sí misma, que se conserva porque hay partes
                  de la interfaz que preguntan "¿qué comparten estos dos?" y la
                  respuesta directa es más barata que recorrer el grafo.      */

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

  /* --- la memoria, el lugar y el acontecimiento como nodos ------------------
     Una memoria entra a la red cuando nombra al menos a una persona que el
     archivo muestra. Si no nombra a nadie no se dibuja acá: no tiene de dónde
     colgarse, y nadie podría llegar a ella navegando desde una persona. Esa
     memoria no desaparece del archivo — vive en el mapa y en la lista de
     memorias, que son sus puertas. Ésta no lo es.

     El lugar y el acontecimiento cuelgan de la MEMORIA, no de cada persona.
     Es más cierto —la memoria ocurrió ahí, las personas aparecen en ella— y
     además arregla solo el error que tenía la versión anterior: la línea al
     lugar salía únicamente de la persona enfocada, así que un acontecimiento
     que relacionaba a cinco personas aparecía colgando de una. */
  const conLugar = new Set(lugares.map(l => l.slug));
  const conEvento = new Set(acontecimientos.map(a => a.slug));
  const porLugar = Object.fromEntries(lugares.map(l => [l.slug, l]));
  const porEvento = Object.fromEntries(acontecimientos.map(a => [a.slug, a]));
  const lugaresVivos = new Set(), eventosVivos = new Set();

  for (const d of documentos) {
    const gente = d.personas.filter(s => P[s]);
    if (!gente.length) continue;

    const id = 'memoria:' + d.slug;
    nodos.push({
      id, tipo: 'memoria', ref: d.slug,
      nombre: d.titulo || d.slug,
      anio: d.fecha?.ref ?? null,
      /* La portada viaja con el nodo: en un archivo de fotografías, el nodo de
         una memoria tiene que poder ser la memoria y no una etiqueta. */
      foto: d.archivo || null,
      gente,
      r: 11 + Math.sqrt(gente.length) * 2.2,
    });
    for (const s of gente) enlaces.push({ source: s, target: id, tipo: 'aparece' });

    for (const l of d.lugares || []) if (conLugar.has(l)) {
      lugaresVivos.add(l);
      enlaces.push({ source: id, target: 'lugar:' + l, tipo: 'ocurre' });
    }
    for (const a of d.acontecimientos || []) if (conEvento.has(a)) {
      eventosVivos.add(a);
      enlaces.push({ source: id, target: 'evento:' + a, tipo: 'ocurre' });
    }
  }

  for (const slug of lugaresVivos)
    nodos.push({ id: 'lugar:' + slug, tipo: 'lugar', ref: slug,
                 nombre: porLugar[slug].nombre, r: 9 });
  for (const slug of eventosVivos)
    nodos.push({ id: 'evento:' + slug, tipo: 'evento', ref: slug,
                 nombre: porEvento[slug].titulo || porEvento[slug].nombre, r: 9 });

  return { nodos, enlaces, grupos: g, familias: fams };
}
