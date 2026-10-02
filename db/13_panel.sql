-- 13_panel.sql — permisos de escritura para el panel de carga
--
-- Hasta acá la base era de sólo lectura: 12_permisos.sql abre SELECT para anon
-- y authenticated, y nada más. El panel escribe, así que necesita su propia
-- puerta — y conviene que sea angosta.
--
-- Las dos puertas de siempre, y hay que abrir las dos:
--   GRANT  → ¿este rol puede tocar la tabla?
--   POLICY → ¿qué filas puede ver o escribir?
--
-- La regla que ordena todo esto: quien carga NO publica. El panel escribe
-- siempre con estado='pendiente', y pasar algo a 'aprobada' es una acción
-- aparte. Un error de carga nunca puede terminar en el sitio sin que alguien
-- lo haya mirado.
--
-- anon no cambia: sigue sin poder escribir una sola fila. El panel sin sesión
-- iniciada no puede hacer nada, y eso es lo único que lo protege — la página
-- es pública, la base no.

begin;

-- ---------------------------------------------------------------------------
-- 1. Quién es administrador
-- ---------------------------------------------------------------------------
-- Estar autenticado no alcanza: cualquiera que se registre en el proyecto sería
-- authenticated. Hace falta estar en esta tabla, y a ella se entra a mano.

create table if not exists administradores (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text,
  puede_publicar boolean not null default false,
  creado_en  timestamptz not null default now()
);

alter table administradores enable row level security;

grant select on administradores to authenticated;

drop policy if exists admin_se_ve_a_si_mismo on administradores;
create policy admin_se_ve_a_si_mismo on administradores
  for select to authenticated using (id = auth.uid());

create or replace function es_admin() returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (select 1 from administradores where id = auth.uid());
  $$;

create or replace function puede_publicar() returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (select 1 from administradores
                    where id = auth.uid() and puede_publicar);
  $$;

-- ---------------------------------------------------------------------------
-- 2. Lo que el panel puede escribir
-- ---------------------------------------------------------------------------

grant insert, update on
  lugares, personas, persona_alias,
  nucleos_familiares, nucleo_hijos,
  memorias, memoria_personas,
  acontecimientos, memoria_acontecimientos, memoria_fotos
to authenticated;

-- Borrar no se abre. Un archivo de memoria no borra: despublica. Si alguna vez
-- hace falta sacar algo, se hace a mano y queda registro de que se hizo a mano.
grant delete on memoria_personas, memoria_acontecimientos, memoria_fotos
to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Las políticas
-- ---------------------------------------------------------------------------
-- Las tablas de entidades y de vínculos van todas con la misma regla: escribe
-- quien es administrador. La excepción es memorias, que lleva la suya.

do $$
declare t text;
begin
  foreach t in array array[
    'lugares', 'personas', 'persona_alias',
    'nucleos_familiares', 'nucleo_hijos',
    'memoria_personas', 'acontecimientos',
    'memoria_acontecimientos', 'memoria_fotos'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists panel_inserta on %I', t);
    execute format('drop policy if exists panel_actualiza on %I', t);
    execute format(
      'create policy panel_inserta on %I for insert to authenticated with check (es_admin())', t);
    execute format(
      'create policy panel_actualiza on %I for update to authenticated using (es_admin()) with check (es_admin())', t);
  end loop;

  foreach t in array array['memoria_personas', 'memoria_acontecimientos', 'memoria_fotos'] loop
    execute format('drop policy if exists panel_borra on %I', t);
    execute format(
      'create policy panel_borra on %I for delete to authenticated using (es_admin())', t);
  end loop;
end $$;

-- memorias: cargar y aprobar son dos permisos distintos --------------------
alter table memorias enable row level security;

drop policy if exists panel_inserta_memoria on memorias;
create policy panel_inserta_memoria on memorias
  for insert to authenticated
  with check (es_admin() and estado = 'pendiente' and es_demo = false);

-- Un administrador sin permiso de publicar puede corregir una memoria todo lo
-- que quiera, pero no puede moverla a 'aprobada'. El que sí lo tiene, puede.
drop policy if exists panel_edita_memoria on memorias;
create policy panel_edita_memoria on memorias
  for update to authenticated
  using (es_admin())
  with check (es_admin() and (puede_publicar() or estado = 'pendiente'));

-- El panel necesita ver lo que todavía no está aprobado; el sitio no.
drop policy if exists panel_ve_pendientes on memorias;
create policy panel_ve_pendientes on memorias
  for select to authenticated using (es_admin());

-- ---------------------------------------------------------------------------
-- 4. Las fotos
-- ---------------------------------------------------------------------------
-- Bucket público de lectura: las imágenes se sirven al sitio estático sin
-- firmar cada URL. Subir, en cambio, es sólo de administradores.

insert into storage.buckets (id, name, public)
  values ('memorias', 'memorias', true)
  on conflict (id) do update set public = true;

drop policy if exists fotos_lectura_publica on storage.objects;
create policy fotos_lectura_publica on storage.objects
  for select to anon, authenticated using (bucket_id = 'memorias');

drop policy if exists fotos_sube_admin on storage.objects;
create policy fotos_sube_admin on storage.objects
  for insert to authenticated with check (bucket_id = 'memorias' and es_admin());

commit;

-- ---------------------------------------------------------------------------
-- Dar de alta al profe
-- ---------------------------------------------------------------------------
-- Primero se crea el usuario en Authentication → Users (correo y contraseña),
-- y después se lo nombra administrador acá. Son dos pasos a propósito: tener
-- cuenta y poder cargar no son lo mismo.
--
--   insert into administradores (id, nombre, puede_publicar)
--   select id, 'Matías', true from auth.users where email = 'EL-CORREO-DEL-PROFE';

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select c.relname as tabla,
       has_table_privilege('anon',          c.oid, 'INSERT') as "anon escribe",
       has_table_privilege('authenticated', c.oid, 'INSERT') as "panel escribe",
       c.relrowsecurity                                      as "RLS encendida",
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
