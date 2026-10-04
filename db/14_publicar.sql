-- 14_publicar.sql — el botón Publicar, sin exponer el deploy hook
--
-- El problema que resuelve: el deploy hook de Cloudflare no lleva
-- autenticación. Cualquiera que tenga la URL puede disparar un build, y por
-- eso la documentación de Cloudflare dice que hay que cuidarla como se cuida
-- cualquier secreto. La primera versión del panel la leía de una variable
-- PUBLIC_, que es exactamente lo contrario: Astro la escribe tal cual dentro
-- del .js que cualquiera puede descargar sin estar logueado.
--
-- Acá la URL nunca sale del servidor. Vive en una tabla que nadie puede leer
-- y sólo la toca una función security definer que antes pregunta si quien
-- llama tiene permiso de publicar. El panel llama a la función; la URL no
-- aparece en ningún lado del lado del navegador.
--
-- Requiere 13_panel.sql corrido antes (de ahí salen administradores y
-- puede_publicar()).

begin;

-- pg_net hace pedidos HTTP desde la base. Es la misma extensión que usa
-- Supabase para sus propios webhooks.
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Dónde vive la URL
-- ---------------------------------------------------------------------------
-- Una sola fila, siempre. El check sobre id la fuerza: no hay forma de
-- terminar con dos configuraciones y no saber cuál manda.

create table if not exists ajustes_publicacion (
  id                 int primary key default 1 check (id = 1),
  deploy_hook        text,
  ultima_publicacion timestamptz,
  ultimo_pedido      bigint
);

insert into ajustes_publicacion (id) values (1) on conflict (id) do nothing;

alter table ajustes_publicacion enable row level security;

-- Ni un grant, ni una política. Nadie la lee ni la escribe desde el cliente,
-- ni siquiera un administrador: la única puerta son las funciones de abajo,
-- que corren como dueñas de la tabla. Una tabla sin políticas con RLS
-- encendida no devuelve ninguna fila, que es justo lo que queremos.
revoke all on ajustes_publicacion from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Publicar
-- ---------------------------------------------------------------------------

create or replace function publicar_sitio()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public, extensions, net
as $$
declare
  url    text;
  ultima timestamptz;
  pedido bigint;
begin
  if not puede_publicar() then
    raise exception 'Esta cuenta no tiene permiso para publicar el sitio.';
  end if;

  select deploy_hook, ultima_publicacion
    into url, ultima
    from ajustes_publicacion where id = 1;

  if url is null or url = '' then
    raise exception 'Todavía no está cargada la dirección de publicación.';
  end if;

  -- Un freno de dos minutos. Cada build consume del presupuesto mensual de
  -- Cloudflare, y apretar el botón tres veces porque no se ve nada es lo más
  -- natural del mundo: el sitio tarda un minuto en reconstruirse y hasta
  -- entonces no hay ninguna señal.
  if ultima is not null and now() - ultima < interval '2 minutes' then
    raise exception 'Recién se publicó. El sitio tarda un minuto en actualizarse; esperá un momento antes de volver a intentar.';
  end if;

  select net.http_post(url := url, body := '{}'::jsonb) into pedido;

  update ajustes_publicacion
     set ultima_publicacion = now(), ultimo_pedido = pedido
   where id = 1;

  return jsonb_build_object('ok', true, 'pedido', pedido);
end $$;

-- En Postgres toda función nace ejecutable por PUBLIC. Si esto no se revoca,
-- el rol anónimo puede llamarla y el trabajo anterior no sirvió de nada.
revoke all on function publicar_sitio() from public, anon;
grant execute on function publicar_sitio() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Cómo salió
-- ---------------------------------------------------------------------------
-- pg_net es asincrónico: el pedido no sale hasta que la transacción termina,
-- así que publicar_sitio() no puede saber si Cloudflare lo aceptó. Sin esta
-- segunda función, un hook mal escrito falla en silencio y el profe queda
-- esperando una publicación que nunca arrancó.

create or replace function estado_publicacion()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public, extensions, net
as $$
declare
  pedido bigint;
  r      record;
begin
  if not puede_publicar() then
    raise exception 'Esta cuenta no tiene permiso para publicar el sitio.';
  end if;

  select ultimo_pedido into pedido from ajustes_publicacion where id = 1;
  if pedido is null then
    return jsonb_build_object('estado', 'sin_pedidos');
  end if;

  select status_code, error_msg, timed_out
    into r
    from net._http_response where id = pedido;

  if not found then
    -- Todavía en vuelo, o ya pasaron las seis horas que pg_net guarda la
    -- respuesta. Las dos cosas se ven igual desde acá y ninguna es un error.
    return jsonb_build_object('estado', 'en_curso');
  end if;

  if r.timed_out then
    return jsonb_build_object('estado', 'error', 'mensaje', 'Cloudflare no respondió a tiempo.');
  end if;
  if r.error_msg is not null then
    return jsonb_build_object('estado', 'error', 'mensaje', r.error_msg);
  end if;
  if r.status_code between 200 and 299 then
    return jsonb_build_object('estado', 'ok', 'codigo', r.status_code);
  end if;

  return jsonb_build_object('estado', 'error', 'codigo', r.status_code,
    'mensaje', 'Cloudflare rechazó el pedido. Puede que la dirección de publicación esté mal.');
end $$;

revoke all on function estado_publicacion() from public, anon;
grant execute on function estado_publicacion() to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Cargar la URL del deploy hook
-- ---------------------------------------------------------------------------
-- En Cloudflare: Workers & Pages → el proyecto → Settings → Builds →
-- Add deploy hook. Nombre cualquiera, rama main. Pegá acá la URL que te da y
-- corré esta línea sola.
--
--   update ajustes_publicacion set deploy_hook = 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...' where id = 1;
--
-- Si alguna vez sospechás que se filtró, se borra el hook en Cloudflare, se
-- crea otro, y se vuelve a correr este update. Nada más.

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select p.proname as funcion,
       has_function_privilege('anon',          p.oid, 'EXECUTE') as "anon puede",
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as "panel puede"
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('publicar_sitio', 'estado_publicacion')
order by p.proname;
