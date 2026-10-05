-- 15_fecha_de_carga.sql — cuándo entró cada memoria al archivo
--
-- La bandeja del panel quiere mostrar lo último cargado primero, y para eso
-- hace falta saber cuándo se cargó cada cosa. La tabla no lo guardaba: el id
-- es un uuid, que no tiene orden, y el único dato temporal era el año de la
-- memoria —cuándo ocurrió, no cuándo la cargaron—, que son dos cosas
-- distintas y la bandeja necesita la segunda.
--
-- Es un dato que vale por sí mismo, además: dentro de un año, saber que una
-- memoria entró en octubre de 2026 dice algo sobre cómo se fue armando el
-- archivo. Un archivo que no registra cuándo recibió lo que tiene pierde su
-- propia historia.

begin;

alter table memorias
  add column if not exists creada_en timestamptz not null default now();

-- Las mismas tres tablas de entidades: saber cuándo apareció un lugar o una
-- persona en el archivo cuesta lo mismo y sirve igual.
alter table lugares        add column if not exists creada_en timestamptz not null default now();
alter table personas       add column if not exists creada_en timestamptz not null default now();
alter table acontecimientos add column if not exists creada_en timestamptz not null default now();

-- El panel pide las pendientes ordenadas por esta columna, y filtra por
-- estado. Con pocas filas Postgres la ignora, pero el archivo va a crecer y
-- crearla ahora cuesta menos que acordarse después.
create index if not exists memorias_estado_creada
  on memorias (estado, creada_en desc);

commit;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select table_name, column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public' and column_name = 'creada_en'
 order by table_name;
