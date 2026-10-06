/* El cliente de Supabase del panel.
   -------------------------------------------------------------------------
   A mano y no con @supabase/supabase-js: de ese paquete se usarían el login,
   cuatro consultas y una subida, y entra entero —unos 40 KB comprimidos— en
   un sitio cuya regla es ser liviano. Lo de abajo son ciento y pico de líneas
   contra la misma API REST.

   La clave que viaja al navegador es la publicable, no la secreta. Eso es
   correcto por diseño: no abre nada por sí sola, porque lo que decide qué se
   puede escribir es la RLS del lado del servidor. La página del panel es
   pública; la base no.                                                      */

const URL_BASE = (import.meta.env.PUBLIC_SUPABASE_URL || '').replace(/\/(rest\/v1\/?)?$/, '');
const CLAVE = import.meta.env.PUBLIC_SUPABASE_KEY || '';

export const configurado = !!(URL_BASE && CLAVE);

/* Cuál de las dos falta. Un panel que sólo dice "no está configurado" obliga a
   adivinar entre un olvido, un error de tipeo en el nombre y un despliegue
   viejo, y las tres se ven igual desde afuera. */
export const faltan = [
  URL_BASE ? null : 'PUBLIC_SUPABASE_URL',
  CLAVE ? null : 'PUBLIC_SUPABASE_KEY',
].filter(Boolean);

const rest = URL_BASE + '/rest/v1/';
const auth = URL_BASE + '/auth/v1/';
const storage = URL_BASE + '/storage/v1/';

/* --- la sesión -----------------------------------------------------------
   Se guarda en localStorage porque el profe no tiene por qué volver a entrar
   cada vez que cierra la pestaña. El token de acceso dura una hora; el de
   refresco lo renueva solo. */
const LLAVE = 'memorias:panel:sesion';
let sesion = null;

try { sesion = JSON.parse(localStorage.getItem(LLAVE) || 'null'); } catch { sesion = null; }

function guardar(s) {
  sesion = s;
  try {
    if (s) localStorage.setItem(LLAVE, JSON.stringify(s));
    else localStorage.removeItem(LLAVE);
  } catch { /* modo privado: la sesión dura lo que dure la pestaña */ }
}

export const haySesion = () => !!sesion?.access_token;
export const correo = () => sesion?.user?.email || '';
/* Quién cargó cada cosa. Las tablas tienen la columna desde el principio y
   estaba quedando vacía: saber quién subió una memoria es parte de poder
   responder por ella. */
export const quien = () => sesion?.user?.id || null;

export async function entrar(email, password) {
  const r = await fetch(auth + 'token?grant_type=password', {
    method: 'POST',
    headers: { apikey: CLAVE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    /* El mensaje de Supabase viene en inglés y dice de más. Al que entra le
       sirve saber una sola cosa: si el problema es el correo y la contraseña
       o es otra cosa. */
    if (r.status === 400) throw new Error('El correo o la contraseña no coinciden.');
    throw new Error(d.msg || d.error_description || `No se pudo entrar (${r.status}).`);
  }
  guardar(d);
  return d;
}

export function salir() { guardar(null); }

async function refrescar() {
  if (!sesion?.refresh_token) return false;
  const r = await fetch(auth + 'token?grant_type=refresh_token', {
    method: 'POST',
    headers: { apikey: CLAVE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: sesion.refresh_token }),
  });
  if (!r.ok) { guardar(null); return false; }
  guardar(await r.json());
  return true;
}

function cabeceras(extra = {}) {
  return {
    apikey: CLAVE,
    Authorization: `Bearer ${sesion?.access_token || CLAVE}`,
    ...extra,
  };
}

/* Un 401 casi siempre es el token de una hora que venció mientras el profe
   llenaba el formulario. Se renueva y se reintenta una sola vez: si falla la
   segunda, es que de verdad no hay sesión. */
async function pedir(url, opciones = {}, reintento = true) {
  const r = await fetch(url, { ...opciones, headers: cabeceras(opciones.headers) });
  if (r.status === 401 && reintento && await refrescar()) return pedir(url, opciones, false);
  return r;
}

async function fallo(r, que) {
  const t = await r.text().catch(() => '');
  if (r.status === 401 || r.status === 403)
    throw new Error(`Esta cuenta no tiene permiso para ${que}. Falta darla de alta como administradora.`);

  /* P0001 es un `raise exception` escrito por nosotros en una función de la
     base: está en castellano y dice qué hacer, así que se muestra tal cual.
     Cualquier otro error se muestra crudo a propósito — un 42703 que diga
     "column memorias.creada_en does not exist" es lo que permitió encontrar
     esa falla; traducirlo a "no se pudo guardar" la habría escondido. */
  let d = null;
  try { d = JSON.parse(t); } catch { /* no es json: se muestra el texto */ }
  if (d?.code === 'P0001' && d.message) throw new Error(d.message);

  throw new Error(`${que}: ${r.status} ${t.slice(0, 200)}`);
}

/* --- consultas ----------------------------------------------------------- */

export async function traer(tabla, consulta = '') {
  const r = await pedir(`${rest}${tabla}?${consulta}`);
  if (!r.ok) await fallo(r, `leer ${tabla}`);
  return r.json();
}

export async function insertar(tabla, filas) {
  const r = await pedir(rest + tabla, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(filas),
  });
  if (!r.ok) await fallo(r, `guardar en ${tabla}`);
  const d = await r.json();
  return Array.isArray(filas) ? d : d[0];
}

export async function actualizar(tabla, id, campos) {
  const r = await pedir(`${rest}${tabla}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(campos),
  });
  if (!r.ok) await fallo(r, `modificar ${tabla}`);
  return (await r.json())[0];
}

/* Borrar lleva el filtro escrito por quien llama y no un id, porque las tablas
   de vínculos no tienen id: la fila es el par. PostgREST rechaza un DELETE sin
   filtro, que es la red que hace falta — un borrado sin `where` acá sería
   vaciar la tabla de un clic. */
export async function borrar(tabla, consulta) {
  if (!consulta) throw new Error('Un borrado sin filtro no se hace.');
  const r = await pedir(`${rest}${tabla}?${consulta}`, { method: 'DELETE' });
  if (!r.ok) await fallo(r, `borrar de ${tabla}`);
}

export async function soyAdmin() {
  if (!haySesion()) return null;
  const f = await traer('administradores', 'select=*').catch(() => []);
  return f[0] || null;
}

/* --- fotos ---------------------------------------------------------------
   La imagen se achica en el navegador antes de subir. Una foto de celular
   pesa seis megas y el archivo no necesita más de 1600 px de ancho: achicarla
   acá ahorra la subida desde la conexión del pueblo, el almacenamiento, y que
   el sitio después cargue imágenes enormes. Y no hace falta tocar el build. */
export function achicar(archivo, maxLado = 1600, calidad = .82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('No se pudo leer la imagen. ¿Es un archivo de foto?'));
    img.onload = () => {
      const k = Math.min(1, maxLado / Math.max(img.width, img.height));
      const w = Math.round(img.width * k), h = Math.round(img.height * k);
      const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      /* webp con respaldo a jpeg: si el navegador no lo soporta, toDataURL
         devuelve un png disfrazado y pesaría de más. */
      c.toBlob(b => b ? resolve({ blob: b, ancho: w, alto: h, tipo: b.type })
                      : reject(new Error('No se pudo procesar la imagen.')),
               'image/webp', calidad);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(archivo);
  });
}

export async function subirFoto(blob, nombre) {
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const ruta = `${nombre}-${Date.now().toString(36)}.${ext}`;
  const r = await pedir(storage + 'object/memorias/' + ruta, {
    method: 'POST',
    headers: { 'Content-Type': blob.type, 'x-upsert': 'true' },
    body: blob,
  });
  if (!r.ok) await fallo(r, 'subir la foto');
  return `${URL_BASE}/storage/v1/object/public/memorias/${ruta}`;
}

/* --- publicar ------------------------------------------------------------
   El deploy hook de Cloudflare no lleva autenticación: quien tenga la URL
   dispara builds. Por eso no está acá. Vive en una tabla de la base que nadie
   puede leer, y la dispara una función que antes pregunta si quien llama
   tiene permiso de publicar. Desde el navegador sólo se ve el nombre de la
   función.

   La primera versión la leía de PUBLIC_DEPLOY_HOOK, que Astro escribe tal
   cual dentro del .js que cualquiera puede bajar sin estar logueado. Era
   publicar un secreto en una variable que se llama, justamente, pública. */

async function rpc(funcion) {
  const r = await pedir(rest + 'rpc/' + funcion, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const d = await r.json().catch(() => ({}));
  /* Los mensajes vienen escritos en la función de Postgres, en castellano y
     pensados para quien los va a leer. Se muestran tal cual. */
  if (!r.ok) throw new Error(d.message || `No se pudo publicar (${r.status}).`);
  return d;
}

export const publicar = () => rpc('publicar_sitio');
export const estadoPublicacion = () => rpc('estado_publicacion');

/* --- código corto --------------------------------------------------------
   El slug. Una vez usado no se cambia nunca, así que se calcula una sola vez
   al guardar y nunca más. */
export const codigo = s => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
