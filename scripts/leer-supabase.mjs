/* Lector de Supabase para el build.
   -------------------------------------------------------------------------
   Devuelve exactamente las mismas filas que devolvería tabla() leyendo los
   CSV: mismos nombres de columna, mismos formatos. Así el resto del pipeline
   —fechas.mjs, linajes.mjs, la red, la grilla, las vistas— no se entera de
   dónde vinieron los datos, y el lector de CSV sigue sirviendo de respaldo.

   No se usan las vistas v_* acá a propósito: el build necesita las filas
   crudas para rearmar el grafo, y las vistas ya están resolviendo otra cosa
   (el panel de detalle, el mapa, la línea de tiempo del lado del servidor).

   Variables de entorno:
     SUPABASE_URL   https://xxxx.supabase.co/rest/v1/
     SUPABASE_KEY   la key publicable (sb_publishable_…). NUNCA la secreta:
                    el build sólo lee, y lee lo que la RLS deja ver.          */

const PAGINA = 1000;
const ANIO = new Date().getFullYear();

/* Presunción de los 100 años. `vive` tiene tres estados y el tercero importa:
   no saber si alguien vive no es lo mismo que saber que no vive. Ante la duda
   se oculta, porque el costo de los dos errores no es simétrico — esconder la
   fecha de un muerto no le hace nada a nadie; publicar la de alguien vivo sí. */
export function pareceViva(p) {
  if (p.vive === true) return true;
  if (p.vive === false) return false;            /* alguien lo verificó */
  if (p.fallecimiento_anio != null) return false;
  if (p.nacimiento_anio == null) return true;    /* sin fecha no se puede presumir */
  return p.nacimiento_anio > ANIO - 100;
}

async function traer(base, key, tabla, { opcional = false } = {}) {
  const filas = [];
  for (let desde = 0; ; desde += PAGINA) {
    const url = `${base}${tabla}?select=*&limit=${PAGINA}&offset=${desde}`;
    const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) {
      if (opcional && (r.status === 404 || r.status === 400)) return [];
      throw new Error(`Supabase ${tabla}: HTTP ${r.status} ${await r.text()}`);
    }
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < PAGINA) return filas;
  }
}

/* La fecha que el admin escribió es la verdad. Si todavía no está cargada,
   se reconstruye un texto equivalente desde las columnas numéricas para que
   lo parsee el mismo fechas.mjs y no haya dos caminos de interpretación. */
function textoFecha(m) {
  if (m.fecha_texto) return m.fecha_texto;
  if (m.anio == null) return 'pendiente';
  if (m.anio_hasta && m.anio_hasta !== m.anio) return `${m.anio}-${m.anio_hasta}`;
  if (m.anio_aprox) return `${m.anio} aprox`;
  return String(m.anio);
}

export async function traerTablas({ incluirDemo = false, incluirPendientes = false } = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!base || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_KEY en el entorno.');
  const raiz = base.endsWith('/') ? base : base + '/';

  const [lugares, personas, alias, nucleos, hijos, memorias, apariciones,
         acontecimientos, memAconts, fotos] = await Promise.all([
    traer(raiz, key, 'lugares'),
    traer(raiz, key, 'personas'),
    traer(raiz, key, 'persona_alias', { opcional: true }),
    traer(raiz, key, 'nucleos_familiares'),
    traer(raiz, key, 'nucleo_hijos'),
    traer(raiz, key, 'memorias'),
    traer(raiz, key, 'memoria_personas'),
    traer(raiz, key, 'acontecimientos', { opcional: true }),
    traer(raiz, key, 'memoria_acontecimientos', { opcional: true }),
    traer(raiz, key, 'memoria_fotos', { opcional: true }),
  ]);

  const vivo = f => incluirDemo || !f.es_demo;
  /* Sin slug todavía (si no se corrió 06_ajustes.sql) el id sirve de
     identificador, pero las URLs quedan feas: el build avisa. */
  const sl = o => o?.slug || o?.id || '';
  const porId = (xs, f = vivo) => Object.fromEntries(xs.filter(f).map(o => [o.id, o]));

  const L = porId(lugares), P = porId(personas), A = porId(acontecimientos);
  const avisos = [];
  if (personas.length && !personas[0].slug)
    avisos.push('Las personas no tienen slug: las URLs van a salir con uuid. Falta correr db/06_ajustes.sql.');
  /* El aviso de coordenadas x/y se quitó: quedó obsoleto cuando el mapa pasó a
     ser la base de OpenStreetMap. Los marcadores se ubican solos desde lat/lng,
     así que no falta nada — avisar de un hueco que ya no existe es ruido que
     tapa los avisos que sí importan. */
  const presuntas = personas.filter(p => vivo(p) && p.vive == null && pareceViva(p)).length;
  if (presuntas)
    avisos.push(`PRIVACIDAD: ${presuntas} persona(s) sin dato de si viven. Se presumen vivas por la regla de los 100 años y se les ocultan fechas y notas.`);

  /* ---- personas ---- */
  const aliasDe = {};
  for (const a of alias) (aliasDe[a.persona_id] ||= []).push(a.alias);
  const filasPersonas = personas.filter(vivo).map(p => ({
    slug: sl(p),
    nombre: p.nombre || '',
    apellido: p.apellido || '',
    apodo: [p.apodo, ...(aliasDe[p.id] || [])].filter(Boolean).join('; '),
    sexo: '',                       /* el esquema no lo guarda, y no hace falta */
    nacimiento: p.nacimiento_anio == null ? ''
      : (p.nacimiento_aprox ? `${p.nacimiento_anio} aprox` : String(p.nacimiento_anio)),
    defuncion: p.fallecimiento_anio == null ? '' : String(p.fallecimiento_anio),
    lugar_origen: sl(L[p.lugar_nacimiento_id]),
    vive: p.vive === true ? 'si' : (pareceViva(p) ? 'presunta' : ''),
    notas: p.notas || '',
  }));

  /* ---- familia ----
     El esquema no distingue padre de madre y no hace falta: aguas abajo la
     pareja se ordena por slug para formar la unión. persona_a y persona_b
     caen en las dos columnas por posición, no por género.
     Los cónyuges se emiten SIEMPRE, incluso sin hijos: una pareja sin hijos
     que no se emite deja a las dos personas sueltas en el grafo. */
  const conyugesDe = {}, padresDe = {};
  for (const n of nucleos.filter(vivo)) {
    const a = P[n.persona_a_id], b = P[n.persona_b_id];
    if (a && b) {
      (conyugesDe[a.id] ||= new Set()).add(sl(b));
      (conyugesDe[b.id] ||= new Set()).add(sl(a));
    }
    for (const h of hijos.filter(x => x.nucleo_id === n.id)) {
      if (!P[h.persona_id]) continue;
      padresDe[h.persona_id] = [a ? sl(a) : '', b ? sl(b) : ''];
    }
  }
  const filasFamilia = personas.filter(vivo)
    .filter(p => padresDe[p.id] || conyugesDe[p.id])
    .map(p => ({
      persona: sl(p),
      padre: padresDe[p.id]?.[0] || '',
      madre: padresDe[p.id]?.[1] || '',
      conyuges: [...(conyugesDe[p.id] || [])].join('; '),
      notas: '',
    }));

  /* ---- documentos ----
     Sólo lo aprobado sale del build. La moderación no necesita código extra:
     es este filtro. */
  const personasDe = {}, acontsDe = {}, fotosDe = {};
  for (const f of fotos) (fotosDe[f.memoria_id] ||= []).push(f);
  for (const k in fotosDe) fotosDe[k].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  for (const a of apariciones) {
    if (P[a.persona_id]) (personasDe[a.memoria_id] ||= []).push(sl(P[a.persona_id]));
  }
  for (const x of memAconts) {
    if (A[x.acontecimiento_id]) (acontsDe[x.memoria_id] ||= []).push(sl(A[x.acontecimiento_id]));
  }
  const filasDocumentos = memorias.filter(vivo)
    .filter(m => incluirPendientes || (m.estado || '').toLowerCase() === 'aprobada')
    .map(m => ({
      slug: sl(m),
      tipo: m.foto_url ? 'foto' : 'relato',
      titulo: m.titulo || '',
      fecha: textoFecha(m),
      descripcion: m.descripcion || '',
      transcripcion: '',
      personas: (personasDe[m.id] || []).join('; '),
      lugares: sl(L[m.lugar_id]),
      acontecimientos: (acontsDe[m.id] || []).join('; '),
      aportante: m.aportado_por || '',
      fuente_url: m.fuente || '',
      archivo: m.foto_url || '',
      archivos: [m.foto_url, ...(fotosDe[m.id] || []).map(f => f.url)]
        .filter((v, i, a) => v && a.indexOf(v) === i).join('; '),
      licencia: '',
      estado: '',
    }));

  /* ---- lugares y acontecimientos ---- */
  const filasLugares = lugares.filter(vivo).map(l => ({
    slug: sl(l), nombre: l.nombre || '', tipo: l.tipo || '',
    x: l.x == null ? '' : String(l.x),
    y: l.y == null ? '' : String(l.y),
    lat: l.lat == null ? '' : String(l.lat),
    lng: l.lng == null ? '' : String(l.lng),
    vigencia: '', alias: l.localidad || '', notas: l.notas || '',
  }));

  const filasAcontecimientos = acontecimientos.filter(vivo).map(a => ({
    slug: sl(a), titulo: a.nombre || '', tipo: '',
    fecha: a.anio == null ? 'pendiente'
      : (a.anio_hasta && a.anio_hasta !== a.anio ? `${a.anio}-${a.anio_hasta}` : String(a.anio)),
    lugares: '', descripcion: a.descripcion || '',
  }));

  return {
    tablas: {
      personas: filasPersonas,
      familia: filasFamilia,
      documentos: filasDocumentos,
      lugares: filasLugares,
      acontecimientos: filasAcontecimientos,
    },
    avisos,
    conteo: {
      personas: filasPersonas.length, familias: nucleos.filter(vivo).length,
      documentos: filasDocumentos.length, lugares: filasLugares.length,
      acontecimientos: filasAcontecimientos.length,
      memoriasOcultas: memorias.filter(vivo).length - filasDocumentos.length,
      demo: personas.filter(p => p.es_demo).length + memorias.filter(m => m.es_demo).length,
      pendientes: memorias.filter(m => vivo(m) && (m.estado || '').toLowerCase() !== 'aprobada').length,
    },
  };
}
