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
   El deploy hook de Cloudflare. Es una URL que dispara el build; no lleva
   credencial propia, así que vive en una variable de entorno y no en el
   código. Si no está configurada, el botón no aparece. */
export const HOOK = import.meta.env.PUBLIC_DEPLOY_HOOK || '';

export async function publicar() {
  if (!HOOK) throw new Error('No hay URL de publicación configurada.');
  const r = await fetch(HOOK, { method: 'POST' });
  if (!r.ok) throw new Error(`La publicación no arrancó (${r.status}).`);
}

/* --- código corto --------------------------------------------------------
   El slug. Una vez usado no se cambia nunca, así que se calcula una sola vez
   al guardar y nunca más. */
export const codigo = s => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
