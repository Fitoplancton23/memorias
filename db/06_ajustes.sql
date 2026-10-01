-- 06_ajustes.sql — ajustes al esquema para el visualizador
-- Idempotente, como los anteriores. Se corre después de 01-05.
--
-- Contexto: la base se diseñó en una sesión y el frontend en otra. Esto
-- cierra las cinco diferencias que quedaron entre los dos.

begin;

-- ---------------------------------------------------------------------------
-- 1. ACONTECIMIENTOS como tabla propia
--
-- Una foto no es un acontecimiento. Diez fotos del bautismo del 52 son UN
-- acontecimiento con diez memorias. Sin esta tabla no se pueden agrupar
-- memorias bajo un hecho del pueblo, y la idea que define el proyecto
-- —familias vinculadas por acontecimientos compartidos— se queda sin nada
-- de dónde colgarse. En el visualizador ya existen como nodos propios de la
-- red y como marcas en la línea de tiempo.
-- ---------------------------------------------------------------------------
create table if not exists acontecimientos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text,
  anio        integer,
  anio_hasta  integer,
  descripcion text,
  notas       text,
  es_demo     boolean not null default false,
  created_at  timestamptz default now()
);

create table if not exists memoria_acontecimientos (
  memoria_id        uuid not null references memorias(id) on delete cascade,
  acontecimiento_id uuid not null references acontecimientos(id) on delete cascade,
  primary key (memoria_id, acontecimiento_id)
);

-- ---------------------------------------------------------------------------
-- 2. COORDENADAS NORMALIZADAS
--
-- El mapa es una ilustración en SVG, no cartografía: no hay proveedor de
-- tiles, ni claves, ni cuota. Las coordenadas van entre 0 y 1 relativas al
-- viewBox, que es lo que permite redibujar el mapa con otro tamaño o más
-- detalle sin reubicar los cincuenta marcadores a mano.
-- lat/lng se quedan como están, por si algún día hace falta cartografía real.
-- ---------------------------------------------------------------------------
alter table lugares add column if not exists x numeric(8,6);
alter table lugares add column if not exists y numeric(8,6);

alter table lugares drop constraint if exists lugares_xy_rango;
alter table lugares add constraint lugares_xy_rango check (
  (x is null or (x >= 0 and x <= 1)) and
  (y is null or (y >= 0 and y <= 1))
);

-- ---------------------------------------------------------------------------
-- 3. PRIVACIDAD: quién vive
--
-- La regla es: si la persona vive, el sitio público oculta sus fechas y sus
-- notas. Tiene que ser un dato explícito y no una inferencia: que no haya
-- año de fallecimiento NO significa que la persona esté viva, significa que
-- no se sabe. Inferirlo sería publicar datos de gente viva por omisión.
-- ---------------------------------------------------------------------------
alter table personas add column if not exists vive boolean not null default false;

-- ---------------------------------------------------------------------------
-- 4. LA FECHA COMO LA ESCRIBIÓ EL ADMIN
--
-- `anio` ya es el año de referencia y está bien: es el que la persona
-- efectivamente escribió, y evita que un "c.1940" termine archivado en 1935.
-- Falta la granularidad. `anio_aprox` es booleano y no distingue:
--     07/10/2025        → dia
--     1966              → anio
--     1960 aprox        → circa      (±5 años)
--     década del 60     → decada     (10 años)
--     pendiente         → desconocida
-- La línea de tiempo codifica la incertidumbre en el ALTO de la marca, así
-- que necesita los cinco niveles, no dos.
--
-- `fecha_texto` guarda lo que se tipeó, literal. Es la verdad; lo derivado
-- es caché reconstruible con scripts/fechas.mjs, que tiene 23 casos de prueba.
-- ---------------------------------------------------------------------------
alter table memorias add column if not exists fecha_texto      text;
alter table memorias add column if not exists precision_fecha  text;

alter table memorias drop constraint if exists memorias_precision_valida;
alter table memorias add constraint memorias_precision_valida check (
  precision_fecha is null or
  precision_fecha in ('dia','anio','circa','decada','desconocida')
);

-- ---------------------------------------------------------------------------
-- 5. SLUGS
--
-- El sitio es estático y genera una página por persona, lugar, acontecimiento
-- y memoria. Que Google las indexe es EL canal de distribución del proyecto:
-- el vecino que busca el apellido del abuelo cae en la ficha y aporta.
-- Con uuid en la URL ese canal se apaga.
-- ---------------------------------------------------------------------------
create or replace function f_slug(txt text) returns text
language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             lower(translate(coalesce(txt, ''),
               'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
               'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')),
             '[^a-z0-9]+', '-', 'g'),
           '(^-+|-+$)', '', 'g');
$$;

alter table personas        add column if not exists slug text;
alter table lugares         add column if not exists slug text;
alter table memorias        add column if not exists slug text;

-- relleno sin colisiones: el segundo "Juan Silveira" queda juan-silveira-2
with n as (
  select id,
         f_slug(nombre || '-' || apellido) as base,
         row_number() over (partition by f_slug(nombre || '-' || apellido)
                            order by created_at nulls last, id) as r
  from personas where slug is null)
update personas p set slug = case when n.r = 1 then n.base else n.base || '-' || n.r end
from n where n.id = p.id;

with n as (
  select id, f_slug(nombre) as base,
         row_number() over (partition by f_slug(nombre) order by created_at nulls last, id) as r
  from lugares where slug is null)
update lugares l set slug = case when n.r = 1 then n.base else n.base || '-' || n.r end
from n where n.id = l.id;

with n as (
  select id, f_slug(titulo) as base,
         row_number() over (partition by f_slug(titulo) order by created_at nulls last, id) as r
  from memorias where slug is null)
update memorias m set slug = case when n.r = 1 then n.base else n.base || '-' || n.r end
from n where n.id = m.id;

with n as (
  select id, f_slug(nombre) as base,
         row_number() over (partition by f_slug(nombre) order by created_at nulls last, id) as r
  from acontecimientos where slug is null)
update acontecimientos a set slug = case when n.r = 1 then n.base else n.base || '-' || n.r end
from n where n.id = a.id;

create unique index if not exists personas_slug_idx        on personas(slug);
create unique index if not exists lugares_slug_idx         on lugares(slug);
create unique index if not exists memorias_slug_idx        on memorias(slug);
create unique index if not exists acontecimientos_slug_idx on acontecimientos(slug);

-- ---------------------------------------------------------------------------
-- 6. RLS de lectura pública para las tablas nuevas
-- ---------------------------------------------------------------------------
alter table acontecimientos         enable row level security;
alter table memoria_acontecimientos enable row level security;

drop policy if exists lectura_publica on acontecimientos;
create policy lectura_publica on acontecimientos for select using (true);

drop policy if exists lectura_publica on memoria_acontecimientos;
create policy lectura_publica on memoria_acontecimientos for select using (true);

commit;

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN — Regla 3: el sistema sabe qué le falta
-- ---------------------------------------------------------------------------
select 'lugares sin ubicar en el mapa'        as hueco, count(*) from lugares  where x is null
union all
select 'memorias sin texto de fecha',         count(*) from memorias where fecha_texto is null
union all
select 'memorias sin precisión',              count(*) from memorias where precision_fecha is null
union all
select 'memorias sin lugar',                  count(*) from memorias where lugar_id is null
union all
select 'memorias sin foto',                   count(*) from memorias where foto_url is null
union all
select 'personas sin linaje relevado',        count(*) from personas where linaje_id is null
union all
select 'personas sin slug',                   count(*) from personas where slug is null
union all
-- Revisar a mano: nacidas hace menos de 100 años, sin año de fallecimiento y
-- marcadas como no vivas. Si alguna vive, sus datos se publicarían.
select 'personas a revisar por privacidad',   count(*) from personas
  where vive = false and fallecimiento_anio is null
    and nacimiento_anio is not null
    and nacimiento_anio > extract(year from now())::int - 100;
