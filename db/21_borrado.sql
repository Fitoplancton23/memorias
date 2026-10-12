-- 21_borrado.sql — eliminar una memoria desde el panel
--
-- db/13_panel.sql decía: «Borrar no se abre. Un archivo de memoria no borra:
-- despublica.» Esa regla cubría dos cosas distintas, y sólo una sigue en pie.
--
-- LA QUE SIGUE. Si alguien pidió salir del archivo, la memoria no se borra.
-- Borrarla perdería el registro de que lo pidió, y sin ese registro nada
-- impide que la misma foto vuelva a entrar el mes que viene por otra puerta.
-- Eso ahora lo sostiene un trigger y no una política, por la razón de siempre:
-- la clave secreta saltea la RLS, no un trigger.
--
-- LA QUE NO. Una memoria cargada dos veces, una prueba, un archivo
-- equivocado, una foto que no era de acá. Ahí no hay nada que registrar, y
-- despublicar sólo deja basura que alguien tiene que volver a mirar en cada
-- revisión — hasta que deja de mirar la bandeja. Eso se borra.

begin;

grant delete on memorias to authenticated;

alter table memorias enable row level security;
drop policy if exists panel_borra on memorias;
create policy panel_borra on memorias
  for delete to authenticated using (es_admin());

-- `to_jsonb(old) ->>` y no `old.permiso_publicacion` a propósito: si todavía no
-- se corrió db/18_consentimiento.sql la columna no existe, y nombrarla haría
-- que este trigger fallara en cada borrado en vez de dejar pasar los que no
-- tienen nada anotado.
create or replace function memoria_con_baja_no_se_borra() returns trigger as $$
begin
  if (to_jsonb(old) ->> 'permiso_publicacion') = 'false' then
    raise exception 'Esta memoria tiene anotado que pidieron no publicarla. No se borra: ese pedido es el registro de que alguien quiso salir del archivo.';
  end if;
  return old;
end $$ language plpgsql;

drop trigger if exists memoria_baja_no_borra on memorias;
create trigger memoria_baja_no_borra
  before delete on memorias
  for each row execute function memoria_con_baja_no_se_borra();

-- Las filas colgadas —personas, fotos, acontecimientos— se van solas por las
-- claves foráneas. Los archivos del bucket no: los borra el panel antes de la
-- fila, y para eso le falta este permiso.
drop policy if exists fotos_borra_admin on storage.objects;
create policy fotos_borra_admin on storage.objects
  for delete to authenticated using (bucket_id = 'memorias' and es_admin());

commit;

-- Verificación: tiene que salir la política de borrado y el trigger.
select polname from pg_policy where polrelid = 'memorias'::regclass and polcmd = 'd';
select tgname from pg_trigger where tgrelid = 'memorias'::regclass and not tgisinternal;
