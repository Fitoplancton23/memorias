/* Un lugar que no es un punto: la picada.
   ==========================================================================
   «La picada Propaganda» no es una esquina ni un edificio: es un camino de
   dos kilómetros que arranca en un lado, dobla en el medio y sigue hasta
   otro. Hay pioneros con memorias de toda esa zona, y marcarla con un pin
   dice algo falso —que las cosas pasaron en ese metro cuadrado— y además
   esconde lo que la hace reconocible, que es el recorrido.

   Así que un lugar puede tener **traza**: una línea quebrada de puntos. No
   reemplaza a la coordenada representativa, la acompaña. Y no cambia lo que
   es un lugar: la picada sigue siendo una entidad con nombre, con sus
   memorias y su ficha, igual que la Escuela Normal.

   Las tres reglas que esto sostiene:

   **La coordenada guardada manda.** Si alguien le fijó un punto a la picada
   —porque ahí está el acceso, o la casa de la que todos hablan— ese punto no
   se toca. La traza sólo pone el punto cuando no hay ninguno. La regla del
   proyecto es que un marcador no se mueve solo, y eso vale también cuando
   aparece una traza.

   **El medio es el medio del recorrido, no el punto del medio de la lista.**
   En una picada que hace una ele, el vértice es el segundo de tres puntos y
   está a un tercio del camino: poner ahí el nombre lo cuelga de un codo
   arbitrario. El medio verdadero es el punto que deja la misma distancia
   para cada lado.

   **Una traza de un solo punto no es una traza.** Es un punto, y ya hay una
   columna para eso. Se rechaza en vez de dibujar una línea de largo cero que
   después nadie entiende por qué no se ve. */

/* `Number('')` es 0, no un error, así que un par vacío —una coma de más en la
   planilla— entraba como el punto (0, 0): una picada que sale de Misiones y
   termina en el golfo de Guinea. Lo encontró un test. */
const num = v => {
  if (typeof v === 'string') { const t = v.trim(); if (!t) return null;
                               const n = Number(t); return Number.isFinite(n) ? n : null; }
  return Number.isFinite(v) ? v : null;
};

/** Lee una traza escrita como "lat,lng; lat,lng; …" o ya como lista. */
export function leerTraza(valor) {
  if (!valor) return [];
  let crudos = valor;
  if (typeof valor === 'string') {
    const t = valor.trim();
    if (!t) return [];
    if (t.startsWith('[')) { try { crudos = JSON.parse(t); } catch (e) { return []; } }
    else crudos = t.split(';').map(par => par.split(','));
  }
  if (!Array.isArray(crudos)) return [];

  const puntos = [];
  for (const c of crudos) {
    let lat = null, lng = null;
    if (Array.isArray(c)) { lat = num(c[0]); lng = num(c[1]); }
    else if (c && typeof c === 'object') { lat = num(c.lat); lng = num(c.lng); }
    if (lat == null || lng == null) continue;
    /* Fuera de rango no es un punto de la tierra: casi siempre es lat y lng
       escritos al revés, o una coma de más. Se descarta en vez de dibujar una
       picada que cruza el océano. */
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    /* Dos puntos iguales seguidos no agregan recorrido y sí ensucian la
       cuenta del medio. */
    const ult = puntos[puntos.length - 1];
    if (ult && ult.lat === lat && ult.lng === lng) continue;
    puntos.push({ lat, lng });
  }
  return puntos.length >= 2 ? puntos : [];
}

/* A esta escala —una picada de dos kilómetros— la tierra es plana y la
   diferencia con la fórmula esférica es de centímetros. Lo único que hay que
   corregir es que un grado de longitud mide menos que uno de latitud cuanto
   más lejos del ecuador: sin eso, una picada que va al este parece más corta
   de lo que es y el medio se corre. */
const LARGO_GRADO = 111_320;
const anchoGrado = lat => LARGO_GRADO * Math.cos(lat * Math.PI / 180);

export function largoEnMetros(puntos) {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1], b = puntos[i];
    const dy = (b.lat - a.lat) * LARGO_GRADO;
    const dx = (b.lng - a.lng) * anchoGrado((a.lat + b.lat) / 2);
    total += Math.hypot(dx, dy);
  }
  return total;
}

/** El punto que deja la misma distancia de recorrido para cada lado. */
export function medioDelRecorrido(puntos) {
  if (!puntos || puntos.length < 2) return null;
  const mitad = largoEnMetros(puntos) / 2;
  let anda = 0;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1], b = puntos[i];
    const dy = (b.lat - a.lat) * LARGO_GRADO;
    const dx = (b.lng - a.lng) * anchoGrado((a.lat + b.lat) / 2);
    const tramo = Math.hypot(dx, dy);
    if (anda + tramo >= mitad) {
      const f = tramo === 0 ? 0 : (mitad - anda) / tramo;
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
    }
    anda += tramo;
  }
  return puntos[puntos.length - 1];
}

/** Dónde va el marcador de este lugar: lo guardado si lo hay, si no el medio. */
export function puntoDeReferencia(lugar) {
  if (lugar && lugar.lat != null && lugar.lng != null)
    return { lat: lugar.lat, lng: lugar.lng, deLaTraza: false };
  const medio = medioDelRecorrido(leerTraza(lugar && lugar.traza));
  return medio ? { ...medio, deLaTraza: true } : null;
}

export const esRecorrido = lugar => leerTraza(lugar && lugar.traza).length >= 2;
