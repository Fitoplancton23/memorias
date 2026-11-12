-- 26_picadas.sql — lugares que no son un punto
--
-- «La picada Propaganda» no es una esquina ni un edificio: es un camino de
-- casi dos kilómetros que arranca en un lado, dobla en el medio y sigue hasta
-- otro, con memorias de pioneros repartidas a lo largo de todo eso. Marcarla
-- con un pin afirma algo falso —que las cosas pasaron en ese metro cuadrado—
-- y además esconde lo único que la hace reconocible, que es el recorrido.
--
-- Así que un lugar puede tener TRAZA: una línea quebrada de coordenadas. No
-- reemplaza a la coordenada representativa, la acompaña, y no cambia lo que
-- es un lugar: la picada sigue siendo una entidad con nombre, su ficha y sus
-- memorias, igual que la Escuela Normal.
--
-- Dos reglas, las dos en `src/lib/traza.js` y con tests:
--   · La coordenada guardada manda. La traza sólo pone el marcador cuando el
--     lugar no tiene coordenada propia — un marcador no se mueve solo.
--   · El marcador va en el medio del RECORRIDO, no en el punto del medio de
--     la lista. En una picada que hace una ele, el vértice está a un tercio
--     del camino y colgar ahí el nombre lo deja en un codo arbitrario.
--
-- Esto es aditivo: sin correrlo, el sitio funciona igual y todos los lugares
-- siguen siendo puntos.

begin;

-- jsonb y no texto: es una lista de pares y la base puede validarla. El
-- lector del build aguanta las dos formas igual, por si alguna vez se carga
-- a mano como "lat,lng; lat,lng".
alter table lugares add column if not exists traza jsonb;

comment on column lugares.traza is
  'Recorrido de un lugar que no es un punto (una picada, un camino viejo, la '
  'costa de un arroyo): [[lat,lng], [lat,lng], …], al menos dos puntos. '
  'No reemplaza a lat/lng: si el lugar tiene coordenada, esa manda.';

-- Al menos dos puntos. Una traza de uno solo es un punto, y para eso ya están
-- lat y lng: dibujarla daría una línea de largo cero que después nadie
-- entiende por qué no se ve.
-- `add constraint` no tiene `if not exists` —a diferencia de `add column`—,
-- asi que sin este `drop` el archivo se podia correr una sola vez: la segunda
-- cortaba con 42710 y, como todo esto va dentro de una transaccion, se caia
-- el archivo entero. Un archivo de migracion que no se puede volver a correr
-- es una trampa: siempre hay una segunda vez.
alter table lugares drop constraint if exists lugares_traza_es_recorrido;
alter table lugares
  add constraint lugares_traza_es_recorrido
  check (traza is null
         or (jsonb_typeof(traza) = 'array' and jsonb_array_length(traza) >= 2));

-- ---------------------------------------------------------------------------
-- La picada Propaganda
-- ---------------------------------------------------------------------------
-- Los tres puntos son los que pasó Facundo: arranca, dobla, y sigue.
update lugares
   set traza = '[[-27.122682402858903, -54.90551406892457],
                 [-27.127538257357372, -54.89609754565490],
                 [-27.134194409427940, -54.89064520314634]]'::jsonb
 where lower(nombre) like '%picada%propaganda%';

commit;

-- ===========================================================================
-- Verificación
-- ===========================================================================

-- 1. ¿Quedó cargada? Si esto devuelve CERO filas, es que la picada todavía no
--    existe como lugar en la base con ese nombre.
select slug, nombre, tipo,
       jsonb_array_length(traza) as puntos,
       lat is not null as "tiene coordenada propia"
  from lugares
 where traza is not null;

-- 1b. Si la de arriba vino vacía, ésta dice por qué: muestra todo lugar cuyo
--     nombre suene a picada o a camino. Si acá aparece con otro nombre, se
--     corrige el `like` del update; si no aparece nada, hay que crearla desde
--     el taller del panel y recién después correr el update.
select slug, nombre, tipo, lat is not null as "tiene coordenada"
  from lugares
 where lower(nombre) like '%picada%'
    or lower(nombre) like '%camino%'
    or lower(nombre) like '%propaganda%';

-- 2. Todos los puntos de todas las trazas tienen que caer adentro del ejido
--    (lat entre -27.153 y -27.001, lng entre -54.960 y -54.758). Lo que
--    aparezca acá es, casi siempre, latitud y longitud escritas al revés.
--    Tiene que dar CERO filas.
select l.nombre,
       (p->>0)::numeric as lat,
       (p->>1)::numeric as lng
  from lugares l, jsonb_array_elements(l.traza) p
 where l.traza is not null
   and ((p->>0)::numeric not between -27.153 and -27.001
     or (p->>1)::numeric not between -54.961 and -54.758);

-- 3. El tipo del lugar no se toca acá a propósito: si querés que diga
--    «picada» en la ficha, se cambia desde el taller del panel, que es donde
--    se corrigen los lugares.
select slug, nombre, tipo from lugares where traza is not null;
