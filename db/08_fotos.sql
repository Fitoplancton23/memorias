-- 08_fotos.sql — varias fotos por memoria
--
-- `memorias.foto_url` guarda una sola imagen. Los primeros datos reales ya
-- rompen eso: de 16 memorias, 3 tienen varias fotos —el Gran Premio del 49
-- tiene tres, la Escuela 425 otras tres—. Es el 19%, y va a ser más: cualquier
-- acto, desfile o carroza llega con el rollo entero.
--
-- `foto_url` se queda como la portada de la memoria, que es lo que se muestra
-- en los listados y en el mapa. El resto vive acá, en orden.

begin;

create table if not exists memoria_fotos (
  id         uuid primary key default gen_random_uuid(),
  memoria_id uuid not null references memorias(id) on delete cascade,
  url        text not null,
  orden      integer not null default 0,
  pie        text,
  ancho      integer,
  alto       integer,
  created_at timestamptz default now(),
  unique (memoria_id, url)
);

create index if not exists memoria_fotos_memoria_idx on memoria_fotos(memoria_id, orden);

alter table memoria_fotos enable row level security;
drop policy if exists lectura_publica on memoria_fotos;
create policy lectura_publica on memoria_fotos for select using (true);

commit;

select 'memorias con más de una foto' as dato, count(*) from (
  select memoria_id from memoria_fotos group by memoria_id having count(*) > 1
) t;
