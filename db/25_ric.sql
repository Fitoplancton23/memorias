-- 25_ric.sql — dejar la estructura lista para Records in Contexts
--
-- NO implementa RiC. Lo que hace es sacar del camino las tres cosas que
-- después no se pueden conseguir, y ninguna de las tres le agrega trabajo al
-- que carga. El razonamiento completo está en
-- `claude/ric-records-in-contexts.md`; acá va lo que toca la base.
--
--   1. Una memoria puede haber ocurrido en más de un lugar.
--   2. Qué ES una memoria se guarda; hoy se adivina mirando si tiene foto.
--   3. Un parentesco puede decir de dónde salió.
--
-- Por qué estas tres y no las veinte que pide la norma: son las únicas en las
-- que el dato que falta NO se puede reconstruir más tarde. Si hoy una
-- procesión entra con un solo lugar, los otros dos lugares no quedan
-- guardados en ninguna parte y nadie se acuerda dentro de dos años. Lo demás
-- —las clases, los nombres de las relaciones, el RDF— se deriva el día que
-- haga falta, de datos que ya vamos a tener.
--
-- Todo es aditivo. Con este archivo corrido el sitio funciona igual que sin
-- él, y el panel sigue andando aunque no se corra: pregunta si las columnas
-- existen, como ya hace con el permiso.

begin;

-- ---------------------------------------------------------------------------
-- 1 · Una memoria, varios lugares
-- ---------------------------------------------------------------------------
-- `memorias.lugar_id` es una sola columna, así que hoy el archivo no puede
-- decir que el desfile del 25 de mayo pasó por la escuela, la plaza y la
-- avenida. Entra por una y las otras dos se pierden en el momento de cargar,
-- que es el único momento en que alguien las sabía.
--
-- La tabla no reemplaza a `lugar_id` todavía: lo acompaña. Primero porque el
-- build y el panel leen esa columna y no se rompen de un día para el otro, y
-- segundo porque el lugar principal —el que decide dónde cae el marcador en
-- el mapa— sigue siendo uno solo y conviene que se vea de un vistazo.

create table if not exists memoria_lugares (
  memoria_id uuid not null references memorias (id) on delete cascade,
  lugar_id   uuid not null references lugares  (id) on delete cascade,
  /* Qué papel juega ese lugar en esta memoria. El valor por defecto cubre el
     99% y el panel no tiene por qué preguntarlo: una memoria ocurrió donde
     ocurrió. Los otros existen para cuando alguien SÍ sabe la diferencia —la
     foto se tomó en el patio pero muestra la iglesia de enfrente—, y nunca
     se infieren. */
  relacion   text not null default 'ocurrio_en'
             check (relacion in ('ocurrio_en', 'se_ve', 'se_refiere_a')),
  orden      integer not null default 0,
  primary key (memoria_id, lugar_id, relacion)
);

-- Lo que ya está cargado entra como está: el lugar que tiene cada memoria es
-- el lugar donde ocurrió. No se inventa nada y no se pierde nada.
insert into memoria_lugares (memoria_id, lugar_id, relacion, orden)
select m.id, m.lugar_id, 'ocurrio_en', 0
  from memorias m
 where m.lugar_id is not null
on conflict do nothing;

-- El panel tiene que poder escribirla, y nadie más. El sitio público NO la
-- lee: es estático y no toca Supabase, así que `anon` no necesita nada acá
-- —el build baja los datos con la clave secreta—. Desde
-- `db/24_notas_sin_anon.sql` las tablas nuevas ya no heredan el grant de
-- anon, así que esto es sólo lo que hace falta y nada más.
alter table memoria_lugares enable row level security;
grant select, insert, update, delete on memoria_lugares to authenticated;

drop policy if exists panel_ve_memoria_lugares on memoria_lugares;
create policy panel_ve_memoria_lugares on memoria_lugares
  for select to authenticated using (es_admin());
drop policy if exists panel_escribe_memoria_lugares on memoria_lugares;
create policy panel_escribe_memoria_lugares on memoria_lugares
  for insert to authenticated with check (es_admin());
drop policy if exists panel_actualiza_memoria_lugares on memoria_lugares;
create policy panel_actualiza_memoria_lugares on memoria_lugares
  for update to authenticated using (es_admin()) with check (es_admin());
drop policy if exists panel_borra_memoria_lugares on memoria_lugares;
create policy panel_borra_memoria_lugares on memoria_lugares
  for delete to authenticated using (es_admin());

-- ---------------------------------------------------------------------------
-- 2 · Qué es cada memoria, dicho y no adivinado
-- ---------------------------------------------------------------------------
-- Hoy el sitio decide si una memoria es una fotografía o un relato mirando si
-- tiene archivo: `tipo: m.foto_url ? 'foto' : 'relato'`. Eso confunde la
-- memoria con su escaneo, que es exactamente lo que RiC separa — y el error
-- ya es visible sin RiC: el relato manuscrito de una vecina, fotografiado
-- para poder leerlo, hoy figura como fotografía. Y una fotografía que todavía
-- no se escaneó figura como relato.
--
-- Se rellena con lo que el sistema venía adivinando, porque para lo cargado
-- hasta hoy esa adivinanza es correcta: se cargaron fotos.

alter table memorias add column if not exists tipo text;

update memorias
   set tipo = case when coalesce(foto_url, '') <> '' then 'foto' else 'relato' end
 where tipo is null;

alter table memorias
  add constraint memorias_tipo_conocido
  check (tipo is null or tipo in ('foto', 'relato', 'recorte', 'documento', 'objeto'));

-- ---------------------------------------------------------------------------
-- 3 · De dónde salió un parentesco
-- ---------------------------------------------------------------------------
-- La regla maestra del proyecto dice que todo vínculo que no sea de
-- parentesco tiene que estar respaldado por una memoria real. El parentesco
-- quedó afuera de esa exigencia, y tiene sentido: un casamiento no necesita
-- una foto para haber ocurrido. Pero hoy el archivo tampoco puede decir de
-- dónde lo sacó, y hay mucha diferencia entre "me lo dijo la hija" y "está en
-- el acta". El día que dos vecinos no coincidan en quién era hijo de quién,
-- lo único que permite resolverlo es esto.
--
-- Las dos columnas son opcionales y el panel no las va a pedir: se completan
-- cuando alguien las sabe. Un parentesco sin fuente sigue siendo un
-- parentesco — la misma regla que una memoria sin fecha.

alter table nucleos_familiares add column if not exists fuente text;
alter table nucleos_familiares add column if not exists confianza text;
alter table nucleo_hijos       add column if not exists fuente text;
alter table nucleo_hijos       add column if not exists confianza text;

-- `confianza` repite los valores que ya usa `memoria_personas`, para que una
-- misma palabra signifique lo mismo en toda la base.
alter table nucleos_familiares
  add constraint nucleos_confianza_conocida
  check (confianza is null or confianza in ('confirmada', 'probable'));
alter table nucleo_hijos
  add constraint nucleo_hijos_confianza_conocida
  check (confianza is null or confianza in ('confirmada', 'probable'));

-- ---------------------------------------------------------------------------
-- 4 · Un identificador no se reusa nunca
-- ---------------------------------------------------------------------------
-- El slug es la dirección pública y, el día que esto sea un archivo
-- publicado como datos, va a ser además el nombre de esa entidad para
-- cualquiera de afuera. Si una persona se borra y meses después otra entra
-- con el mismo slug, los enlaces que alguien mandó por WhatsApp pasan a
-- apuntar a otra persona, sin que nada falle y sin que nadie se entere.
--
-- Esta tabla no impide nada por sí sola: deja el registro para que el panel
-- pueda consultarlo al generar un slug, y para que dentro de cinco años se
-- pueda saber qué había en una dirección que ya no existe.

create table if not exists identificadores_retirados (
  tipo       text not null check (tipo in ('memoria', 'persona', 'lugar', 'acontecimiento')),
  slug       text not null,
  que_era    text,
  retirado_en timestamptz not null default now(),
  primary key (tipo, slug)
);

alter table identificadores_retirados enable row level security;
grant select, insert on identificadores_retirados to authenticated;
drop policy if exists panel_ve_retirados on identificadores_retirados;
create policy panel_ve_retirados on identificadores_retirados
  for select to authenticated using (es_admin());
drop policy if exists panel_anota_retirados on identificadores_retirados;
create policy panel_anota_retirados on identificadores_retirados
  for insert to authenticated with check (es_admin());

commit;

-- ===========================================================================
-- Verificación. Lo que tiene que dar:
--   lugares por memoria   -> una fila por cada memoria que tenía lugar
--   memorias sin tipo     -> 0
--   columnas nuevas       -> las seis
-- ===========================================================================

select count(*) as "vinculos memoria-lugar" from memoria_lugares;

select count(*) as "memorias con lugar (tiene que coincidir con el de arriba)"
  from memorias where lugar_id is not null;

select tipo, count(*) as memorias from memorias group by tipo order by tipo;

select table_name as tabla, column_name as columna
  from information_schema.columns
 where table_schema = 'public'
   and (table_name, column_name) in (
        ('memorias', 'tipo'),
        ('nucleos_familiares', 'fuente'), ('nucleos_familiares', 'confianza'),
        ('nucleo_hijos', 'fuente'), ('nucleo_hijos', 'confianza'))
 order by table_name, column_name;

-- Y que ninguna de las dos tablas nuevas sea alcanzable con la clave
-- pública. Las dos tienen que dar FALSE, y no por prudencia: el sitio es
-- estático y no lee Supabase, así que nada de esto necesita estar abierto.
-- Si alguna diera true, es que el `alter default privileges` volvió.
select has_table_privilege('anon', 'memoria_lugares', 'SELECT') as "anon lee memoria_lugares (false)",
       has_table_privilege('anon', 'identificadores_retirados', 'SELECT') as "anon lee retirados (false)";
