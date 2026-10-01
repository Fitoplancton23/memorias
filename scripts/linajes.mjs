/* Convierte el formato de carga de linajes en el grafo de parentesco.
   Formato, un grupo familiar por línea:

     Luis Dinarte Silveira y Clementina Hermann. Hijos: Gerardo Isaac Silveira,
     Celina Silveira, Susana Silveira, Oscar Silveira, Roberto Silveira

   También acepta un solo progenitor, y un matrimonio sin hijos cargados.
   Las personas se identifican por su nombre completo normalizado, así que la
   misma persona nombrada en dos grupos distintos es una sola, y es lo que
   enhebra los linajes entre sí.                                              */

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'dos', 'van', 'von']);

export const aSlug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function prolijo(nombre) {
  return nombre.trim().replace(/\s+/g, ' ').split(' ')
    .map((p, i) => {
      const b = p.toLowerCase();
      return (i > 0 && PARTICULAS.has(b)) ? b : b.charAt(0).toUpperCase() + b.slice(1);
    }).join(' ');
}

/* distancia de edición, para detectar apellidos tipeados distinto */
function distancia(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i-1][j] + 1, m[i][j-1] + 1, m[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return m[a.length][b.length];
}

const apellidoDe = n => { const p = n.trim().split(/\s+/); return p[p.length - 1] || ''; };

export function parseLinajes(texto) {
  const personas = new Map();     // slug -> { slug, nombre, apellido, nombreCompleto }
  const uniones = [];
  const filiaciones = [];
  const avisos = [];

  const alta = crudo => {
    const nombre = prolijo(crudo);
    const slug = aSlug(nombre);
    if (!slug) return null;
    if (!personas.has(slug)) {
      const partes = nombre.split(' ');
      personas.set(slug, {
        slug, nombreCompleto: nombre,
        nombre: partes.slice(0, -1).join(' ') || nombre,
        apellido: partes.length > 1 ? partes[partes.length - 1] : ''
      });
    }
    return slug;
  };

  const lineas = texto.split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  for (const [i, linea] of lineas.entries()) {
    const nLinea = i + 1;
    const sinAcento = linea.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const corte = sinAcento.search(/\bhij[oa]s?(\s+e\s+hijas)?\s*:/i);

    let parteAdultos = linea, parteHijos = '';
    if (corte !== -1) {
      parteAdultos = linea.slice(0, corte);
      parteHijos = linea.slice(corte).replace(/^[^:]*:/, '');
    }

    parteAdultos = parteAdultos.replace(/[.;]\s*$/, '').trim();
    const adultos = parteAdultos.split(/\s+y\s+|\s*&\s*/i)
      .map(s => s.trim()).filter(Boolean);

    if (!adultos.length) { avisos.push(`linajes.txt línea ${nLinea}: no se reconoció ningún progenitor.`); continue; }
    if (adultos.length > 2) avisos.push(`linajes.txt línea ${nLinea}: ${adultos.length} adultos en un mismo grupo; se toman los dos primeros como pareja.`);

    const slugsAdultos = adultos.map(alta).filter(Boolean);
    if (slugsAdultos.length >= 2) {
      const [a, b] = slugsAdultos;
      if (!uniones.some(u => (u.a === a && u.b === b) || (u.a === b && u.b === a))) uniones.push({ a, b });
    }

    const hijos = parteHijos.split(/[,;]|\sy\s/).map(s => s.replace(/\.\s*$/, '').trim()).filter(Boolean);
    for (const h of hijos) {
      const s = alta(h);
      if (!s) continue;
      if (slugsAdultos.includes(s)) {
        avisos.push(`linajes.txt línea ${nLinea}: "${prolijo(h)}" figura como progenitor e hijo a la vez; se ignora la filiación.`);
        continue;
      }
      filiaciones.push({ hijo: s, padres: slugsAdultos.slice(0, 2) });
    }

    /* apellidos tipeados distinto dentro del mismo grupo: casi siempre es un error de tipeo,
       y si pasa se parte el linaje en dos sin que nadie lo note */
    const apeAdultos = adultos.map(apellidoDe).filter(a => a.length > 2);
    for (const h of hijos) {
      const ah = apellidoDe(h);
      if (ah.length <= 2) continue;
      for (const aa of apeAdultos) {
        const d = distancia(ah, aa);
        if (d > 0 && d <= 2)
          avisos.push(`linajes.txt línea ${nLinea}: "${prolijo(h)}" — ¿el apellido debería ser "${prolijo(aa)}" en vez de "${prolijo(ah)}"? Si no se corrige, quedan como dos linajes distintos.`);
      }
    }
  }

  return { personas: [...personas.values()], uniones, filiaciones, avisos };
}
