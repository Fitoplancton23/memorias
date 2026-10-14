/* Qué otra memoria tiene que ver con ésta.
   -------------------------------------------------------------------------
   Es el descubrimiento que justifica el proyecto: alguien vino a buscar a su
   bisabuelo, encontró una foto, y desde ahí tiene que poder llegar a otra que
   no sabía que existía.

   La regla maestra del archivo vale igual acá. Un vínculo que no sea de
   parentesco tiene que estar respaldado por algo real, y una relación que no
   se puede nombrar no se dibuja: cada memoria relacionada viene con la razón
   escrita —la persona, el lugar, el acontecimiento o el año que comparten— y
   la pantalla la muestra. "Relacionadas" a secas es una afirmación del
   archivo que nadie puede verificar.

   Lo que NO relaciona, aunque sería fácil:

   · La década. Para eso está el filtro, y con ciento cuarenta memorias en
     ochenta años casi todas comparten década con casi todas: una relación que
     alcanza a todos no relaciona a nadie.
   · El parecido del título o del texto. Dos memorias tituladas "Acto escolar"
     no tienen nada que ver si son de escuelas distintas; el archivo no lo
     sabe, y suponerlo sería inventar un dato.                                */

/* Cuánto pesa cada cosa compartida. La persona pesa más que el lugar porque
   es lo que la gente viene a buscar: compartir la plaza con otra foto es casi
   no compartir nada en un pueblo donde todo pasó en la plaza. */
export const PESOS = { persona: 4, lugar: 2, hecho: 3, anio: 1 };

/* Cuál razón se muestra cuando hay varias. El mismo orden que usa el
   buscador, por el mismo motivo: es el orden en que la gente nombra lo que
   busca. */
const ORDEN = ['persona', 'hecho', 'lugar', 'anio'];

const comunes = (a, b) => (a || []).filter(x => (b || []).includes(x));

/* `d` y las de `todas` son documentos del snapshot tal cual: slugs, no
   nombres. `nombres` es slug -> cómo se escribe en pantalla; lo que no esté
   ahí no se puede nombrar, y lo que no se puede nombrar no relaciona. */
export function relacionadas(d, todas, nombres = {}, tope = 8) {
  if (!d) return [];
  const anio = d.fecha?.ref ?? null;
  const salida = [];

  for (const o of todas) {
    if (!o || o.slug === d.slug) continue;

    const gente  = comunes(o.personas, d.personas).filter(s => nombres[s]);
    const sitios = comunes(o.lugares, d.lugares).filter(s => nombres[s]);
    const hechos = comunes(o.acontecimientos, d.acontecimientos).filter(s => nombres[s]);
    const mismoAnio = anio != null && (o.fecha?.ref ?? null) === anio;

    const puntos = gente.length * PESOS.persona + sitios.length * PESOS.lugar
                 + hechos.length * PESOS.hecho + (mismoAnio ? PESOS.anio : 0);
    if (!puntos) continue;

    /* La razón que se muestra: la primera del orden que exista. Se nombra una
       sola aunque compartan tres — "También aparece Juan Potkova, en la
       Escuela 425, en 1948" es un informe, no una invitación a mirar. */
    const candidatas = {
      persona: gente[0] && { que: 'persona', por: nombres[gente[0]] },
      hecho:   hechos[0] && { que: 'hecho',  por: nombres[hechos[0]] },
      lugar:   sitios[0] && { que: 'lugar',  por: nombres[sitios[0]] },
      anio:    mismoAnio && { que: 'anio',   por: String(anio) },
    };
    const razon = ORDEN.map(k => candidatas[k]).find(Boolean);
    salida.push({ slug: o.slug, puntos, ...razon });
  }

  /* Más parecidas primero; a igual parecido, las más viejas, que es el orden
     del archivo. El slug desempata para que dos cargas iguales no cambien de
     lugar entre dos construcciones. */
  const anioDe = s => (todas.find(x => x.slug === s)?.fecha?.ref) ?? Infinity;
  salida.sort((a, b) => b.puntos - a.puntos
    || anioDe(a.slug) - anioDe(b.slug)
    || a.slug.localeCompare(b.slug));

  /* El tope no es un detalle de rendimiento: sin él, una memoria de la plaza
     lista las ciento cuarenta y la pantalla deja de decir "mirá ésta". */
  return salida.slice(0, tope);
}

/* Cómo se le dice a alguien por qué le estamos mostrando esta otra memoria.
   Una sola frase para todo el sitio, como la del buscador. */
export function porQue(r) {
  if (!r) return '';
  switch (r.que) {
    case 'persona': return `También aparece ${r.por}`;
    case 'hecho':   return `También es de ${r.por}`;
    case 'lugar':   return `También en ${r.por}`;
    case 'anio':    return `También de ${r.por}`;
    default:        return '';
  }
}
