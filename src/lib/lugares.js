/* Cuáles son los lugares de una memoria.
   ==========================================================================
   Durante todo el proyecto una memoria tuvo UN lugar, porque la base tiene
   una sola columna `lugar_id`. Eso alcanza para una foto de la escuela y no
   alcanza para un desfile: el del 25 de mayo pasó por la escuela, la plaza y
   la avenida, y de esos tres se guardaba uno. Los otros dos no quedaban en
   ninguna parte — y el único momento en que alguien los sabía era el momento
   de cargar.

   Dos reglas, y las dos existen para no mentir en el mapa:

   **El primero es el principal.** `lugar_id` sigue decidiendo dónde cae el
   marcador. Los demás acompañan. Si el orden saliera de la tabla de
   vínculos, agregar un lugar podría mudar una memoria de lugar en el mapa sin
   que nadie lo haya pedido.

   **Un lugar que apenas se ve en la foto no es donde ocurrió.** Desde la
   terraza de la escuela se ve el puente; la memoria no ocurrió en el puente.
   Por eso el vínculo lleva escrito qué relación es, y acá entran sólo los
   `ocurrio_en`. Lo demás se guarda igual —es un dato que alguien sabía— pero
   no decide una posición.

   Vive separado del lector de Supabase para poder probarlo sin una base:
   el entorno de desarrollo no alcanza Supabase, así que lo que no tiene test
   acá no se puede verificar en ningún lado hasta que falla en producción. */

export const RELACIONES = ['ocurrio_en', 'se_ve', 'se_refiere_a'];
export const DONDE_OCURRIO = 'ocurrio_en';

/**
 * @param memoria   { id, lugar_id }
 * @param vinculos  filas de `memoria_lugares` (puede no existir la tabla: [])
 * @param slugDe    (lugar_id) => slug público, o '' si ese lugar no está
 */
export function lugaresDeMemoria(memoria, vinculos = [], slugDe = () => '') {
  const slugs = [];
  const sumar = id => {
    if (!id) return;
    const s = slugDe(id);
    if (s && !slugs.includes(s)) slugs.push(s);
  };

  sumar(memoria?.lugar_id);

  const propios = (vinculos || [])
    .filter(v => v && v.memoria_id === memoria?.id)
    .filter(v => (v.relacion || DONDE_OCURRIO) === DONDE_OCURRIO)
    /* `orden` es lo que el que cargó decidió; a igual orden, el orden en que
       vinieron. Nunca el alfabético: «la plaza y después la avenida» es el
       recorrido, y ordenarlo por nombre lo rompe. */
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  for (const v of propios) sumar(v.lugar_id);
  return slugs;
}
