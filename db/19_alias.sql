-- 19_alias.sql — poder sacar un alias escrito mal
--
-- `persona_alias` tenía permiso de escribir y de modificar, pero no de borrar:
-- al escribir el 13 el borrado se dejó sólo para las tablas de vínculos de una
-- memoria. La consecuencia aparece recién ahora, con el taller de corrección:
-- un apodo mal escrito se podía sumar y no sacar.
--
-- La fila es el par (persona, alias), así que se borra por el par. Es el mismo
-- caso que memoria_personas.

grant delete on persona_alias to authenticated;

drop policy if exists panel_borra on persona_alias;
create policy panel_borra on persona_alias
  for delete to authenticated using (es_admin());

-- Verificación
select policyname as politica, cmd as sobre
  from pg_policies
 where schemaname = 'public' and tablename = 'persona_alias'
 order by policyname;
